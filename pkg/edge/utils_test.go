package edge

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestGetPortainerURLFromEdgeKey(t *testing.T) {
	tests := []struct {
		name     string
		edgeKey  string
		expected string
	}{
		{
			name:     "ValidEdgeKey",
			edgeKey:  "aHR0cHM6Ly9wb3J0YWluZXIuaW98cG9ydGFpbmVyLmlvOjgwMDB8YXNkZnwx",
			expected: "https://portainer.io",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := GetPortainerURLFromEdgeKey(tt.edgeKey)
			assert.NoError(t, err)
			assert.Equal(t, tt.expected, result)
		})
	}
}
