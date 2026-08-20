package handler

import (
	"net/http"

	"github.com/fluxmin/geo-service/geo"
	"github.com/gin-gonic/gin"
)

type LookupRequest struct {
	IP string `json:"ip" binding:"required,min=3,max=45"`
}

type Handler struct {
	geo *geo.Service
}

func New(geoSvc *geo.Service) *Handler {
	return &Handler{geo: geoSvc}
}

func (h *Handler) Health(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":    "ok",
		"service":   "FluxMin Geo Service",
		"providers": h.geo.ProvidersStatus(),
	})
}

func (h *Handler) Lookup(c *gin.Context) {
	var req LookupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"detail": "IP requise"})
		return
	}
	c.JSON(http.StatusOK, h.geo.Lookup(req.IP))
}
