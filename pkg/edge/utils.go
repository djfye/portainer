package edge

import (
	"encoding/base64"
	"errors"
	"strconv"
	"strings"
)

// GetPortainerURLFromEdgeKey returns the portainer URL from an edge key
// format: <portainer_instance_url>|<tunnel_server_addr>|<tunnel_server_fingerprint>|<endpoint_id>
func GetPortainerURLFromEdgeKey(edgeKey string) (string, error) {
	decodedKey, err := base64.RawStdEncoding.DecodeString(edgeKey)
	if err != nil {
		return "", err
	}

	keyInfo := strings.Split(string(decodedKey), "|")

	if len(keyInfo) != 4 {
		return "", errors.New("invalid key format")
	}

	_, err = strconv.Atoi(keyInfo[3])
	if err != nil {
		return "", errors.New("invalid key format")
	}

	return keyInfo[0], nil
}
