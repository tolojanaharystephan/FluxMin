package geo

import (
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"strings"

	"github.com/fluxmin/geo-service/cache"
	"github.com/fluxmin/geo-service/config"
)

type Service struct {
	cfg    config.Config
	client *http.Client
	cache  *cache.Cache[Result]
}

func NewService(cfg config.Config) *Service {
	return &Service{
		cfg: cfg,
		client: &http.Client{
			Timeout: cfg.RequestTimeout,
		},
		cache: cache.New[Result](cfg.CacheTTL),
	}
}

func IsPrivateIP(ip string) bool {
	ip = strings.TrimSpace(ip)
	if ip == "" || ip == "unknown" || ip == "::1" || ip == "127.0.0.1" || ip == "localhost" {
		return true
	}
	parsed := net.ParseIP(ip)
	if parsed == nil {
		return true
	}
	return parsed.IsLoopback() || parsed.IsPrivate() || parsed.IsLinkLocalUnicast() || parsed.IsLinkLocalMulticast()
}

func (s *Service) ProvidersStatus() map[string]bool {
	return map[string]bool{
		"apilayer":  strings.TrimSpace(s.cfg.ApilayerAPIKey) != "",
		"ipstack":   strings.TrimSpace(s.cfg.IpstackAccessKey) != "",
		"ipapi.co":  true,
		"ip-api.com": true,
	}
}

func (s *Service) Lookup(ip string) Result {
	ip = strings.TrimSpace(ip)
	if IsPrivateIP(ip) {
		local := "local"
		ville := "Réseau local"
		isp := "IP privée — lookup public impossible"
		return Result{
			IP:       ip,
			Local:    true,
			Ville:    &ville,
			ISP:      &isp,
			Provider: &local,
		}
	}

	if cached, ok := s.cache.Get(ip); ok {
		return cached
	}

	providers := []func(string) (*Result, error){
		s.fromApilayer,
		s.fromIpstack,
		s.fromIpapiCo,
		s.fromIpApiCom,
	}

	for _, fn := range providers {
		res, err := fn(ip)
		if err != nil || res == nil {
			continue
		}
		if res.PaysCode != nil || res.Ville != nil {
			res.IP = ip
			res.Local = false
			res.MapURL = mapURL(res.Latitude, res.Longitude)
			s.cache.Set(ip, *res)
			return *res
		}
	}

	return empty(ip, nil)
}

func (s *Service) getJSON(url string, headers map[string]string) (map[string]any, error) {
	req, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "FluxMin-GeoService/1.0")
	req.Header.Set("Accept", "application/json")
	for k, v := range headers {
		req.Header.Set(k, v)
	}
	resp, err := s.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("HTTP %d", resp.StatusCode)
	}
	body, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return nil, err
	}
	var data map[string]any
	if err := json.Unmarshal(body, &data); err != nil {
		return nil, err
	}
	return data, nil
}

func asString(v any) string {
	switch t := v.(type) {
	case string:
		return t
	case float64:
		return fmt.Sprintf("%v", t)
	case json.Number:
		return t.String()
	default:
		if v == nil {
			return ""
		}
		return fmt.Sprintf("%v", v)
	}
}

func pick(data map[string]any, keys ...string) *string {
	for _, k := range keys {
		if v, ok := data[k]; ok && v != nil {
			s := asString(v)
			if s != "" {
				return &s
			}
		}
	}
	return nil
}

func (s *Service) fromApilayer(ip string) (*Result, error) {
	key := strings.TrimSpace(s.cfg.ApilayerAPIKey)
	if key == "" {
		return nil, nil
	}
	data, err := s.getJSON(
		"https://api.apilayer.com/ip_api/"+ip,
		map[string]string{"apikey": key},
	)
	if err != nil {
		return nil, err
	}
	if status, ok := data["status"].(string); ok && status != "success" {
		return nil, nil
	}
	prov := "apilayer"
	return &Result{
		Pays:      pick(data, "country", "country_name"),
		PaysCode:  pick(data, "countryCode", "country_code"),
		Ville:     pick(data, "city"),
		Region:    pick(data, "regionName", "region_name"),
		ISP:       pick(data, "isp", "org"),
		Latitude:  pick(data, "lat", "latitude"),
		Longitude: pick(data, "lon", "longitude"),
		Provider:  &prov,
	}, nil
}

func (s *Service) fromIpstack(ip string) (*Result, error) {
	key := strings.TrimSpace(s.cfg.IpstackAccessKey)
	if key == "" {
		return nil, nil
	}
	data, err := s.getJSON(
		fmt.Sprintf("https://api.ipstack.com/%s?access_key=%s", ip, key),
		nil,
	)
	if err != nil {
		return nil, err
	}
	if _, hasErr := data["error"]; hasErr {
		return nil, nil
	}
	if pick(data, "country_code") == nil {
		return nil, nil
	}
	prov := "ipstack"
	var isp *string
	if conn, ok := data["connection"].(map[string]any); ok {
		isp = pick(conn, "isp", "isp_name")
	}
	return &Result{
		Pays:      pick(data, "country_name"),
		PaysCode:  pick(data, "country_code"),
		Ville:     pick(data, "city"),
		Region:    pick(data, "region_name"),
		ISP:       isp,
		Latitude:  pick(data, "latitude"),
		Longitude: pick(data, "longitude"),
		Provider:  &prov,
	}, nil
}

func (s *Service) fromIpapiCo(ip string) (*Result, error) {
	data, err := s.getJSON("https://ipapi.co/"+ip+"/json/", nil)
	if err != nil {
		return nil, err
	}
	if _, hasErr := data["error"]; hasErr {
		return nil, nil
	}
	if pick(data, "country_code") == nil {
		return nil, nil
	}
	prov := "ipapi.co"
	return &Result{
		Pays:      pick(data, "country_name"),
		PaysCode:  pick(data, "country_code"),
		Ville:     pick(data, "city"),
		Region:    pick(data, "region"),
		ISP:       pick(data, "org"),
		Latitude:  pick(data, "latitude"),
		Longitude: pick(data, "longitude"),
		Provider:  &prov,
	}, nil
}

func (s *Service) fromIpApiCom(ip string) (*Result, error) {
	data, err := s.getJSON("http://ip-api.com/json/"+ip+"?fields=status,message,country,countryCode,regionName,city,lat,lon,isp,org", nil)
	if err != nil {
		return nil, err
	}
	if status, ok := data["status"].(string); ok && status != "success" {
		return nil, nil
	}
	prov := "ip-api.com"
	return &Result{
		Pays:      pick(data, "country"),
		PaysCode:  pick(data, "countryCode"),
		Ville:     pick(data, "city"),
		Region:    pick(data, "regionName"),
		ISP:       pick(data, "isp", "org"),
		Latitude:  pick(data, "lat"),
		Longitude: pick(data, "lon"),
		Provider:  &prov,
	}, nil
}
