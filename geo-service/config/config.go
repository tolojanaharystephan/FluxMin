package config

import (
	"os"
	"strconv"
	"time"
)

type Config struct {
	Port             string
	ApilayerAPIKey   string
	IpstackAccessKey string
	CacheTTL         time.Duration
	RequestTimeout   time.Duration
}

func Load() Config {
	ttlSec := envInt("CACHE_TTL_SECONDS", 600)
	timeoutSec := envFloat("REQUEST_TIMEOUT", 5.0)

	return Config{
		Port:             env("PORT", "8001"),
		ApilayerAPIKey:   env("APILAYER_API_KEY", ""),
		IpstackAccessKey: env("IPSTACK_ACCESS_KEY", ""),
		CacheTTL:         time.Duration(ttlSec) * time.Second,
		RequestTimeout:   time.Duration(timeoutSec * float64(time.Second)),
	}
}

func env(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func envInt(key string, fallback int) int {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	n, err := strconv.Atoi(v)
	if err != nil {
		return fallback
	}
	return n
}

func envFloat(key string, fallback float64) float64 {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	n, err := strconv.ParseFloat(v, 64)
	if err != nil {
		return fallback
	}
	return n
}
