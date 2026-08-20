package geo

type Result struct {
	IP        string  `json:"ip"`
	Local     bool    `json:"local"`
	Pays      *string `json:"pays"`
	PaysCode  *string `json:"paysCode"`
	Ville     *string `json:"ville"`
	Region    *string `json:"region"`
	ISP       *string `json:"isp"`
	Latitude  *string `json:"latitude"`
	Longitude *string `json:"longitude"`
	Provider  *string `json:"provider"`
	MapURL    *string `json:"mapUrl"`
}

func mapURL(lat, lon *string) *string {
	if lat == nil || lon == nil || *lat == "" || *lon == "" {
		return nil
	}
	u := "https://www.openstreetmap.org/?mlat=" + *lat + "&mlon=" + *lon +
		"#map=12/" + *lat + "/" + *lon
	return &u
}

func empty(ip string, provider *string) Result {
	return Result{
		IP:       ip,
		Local:    false,
		Provider: provider,
	}
}
