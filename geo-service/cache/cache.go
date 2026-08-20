package cache

import (
	"sync"
	"time"
)

type entry[T any] struct {
	at    time.Time
	value T
}

type Cache[T any] struct {
	mu  sync.RWMutex
	ttl time.Duration
	m   map[string]entry[T]
}

func New[T any](ttl time.Duration) *Cache[T] {
	return &Cache[T]{
		ttl: ttl,
		m:   make(map[string]entry[T]),
	}
}

func (c *Cache[T]) Get(key string) (T, bool) {
	c.mu.RLock()
	defer c.mu.RUnlock()
	e, ok := c.m[key]
	if !ok || time.Since(e.at) > c.ttl {
		var zero T
		return zero, false
	}
	return e.value, true
}

func (c *Cache[T]) Set(key string, value T) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.m[key] = entry[T]{at: time.Now(), value: value}
}
