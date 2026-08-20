package main

import (
	"log"

	"github.com/fluxmin/geo-service/config"
	"github.com/fluxmin/geo-service/geo"
	"github.com/fluxmin/geo-service/handler"
	"github.com/gin-gonic/gin"
)

func main() {
	cfg := config.Load()
	svc := geo.NewService(cfg)
	h := handler.New(svc)

	r := gin.New()
	r.Use(gin.Recovery(), gin.Logger())

	r.GET("/health", h.Health)
	r.POST("/lookup", h.Lookup)

	addr := ":" + cfg.Port
	log.Printf("FluxMin Geo Service listening on %s", addr)
	if err := r.Run(addr); err != nil {
		log.Fatal(err)
	}
}
