package filesystem

import (
	"testing"

	portainer "github.com/portainer/portainer/api"
	"github.com/stretchr/testify/assert"
)

func TestMultiFilterDirForPerDevConfigs(t *testing.T) {
	type args struct {
		dirEntries      []DirEntry
		configPath      string
		multiFilterArgs MultiFilterArgs
	}

	baseDirEntries := []DirEntry{
		{".env", "", true, 420},
		{"docker-compose.yaml", "", true, 420},
		{"configs", "", false, 420},
		{"configs/file1.conf", "", true, 420},
		{"configs/file2.conf", "", true, 420},
		{"configs/folder1", "", false, 420},
		{"configs/folder1/config1", "", true, 420},
		{"configs/folder2", "", false, 420},
		{"configs/folder2/config2", "", true, 420},
	}

	tests := []struct {
		name string
		args args
		want []DirEntry
	}{
		{
			name: "filter file1",
			args: args{
				baseDirEntries,
				"configs",
				MultiFilterArgs{{"file1", portainer.PerDevConfigsTypeFile}},
			},
			want: []DirEntry{baseDirEntries[0], baseDirEntries[1], baseDirEntries[2], baseDirEntries[3]},
		},
		{
			name: "filter folder1",
			args: args{
				baseDirEntries,
				"configs",
				MultiFilterArgs{{"folder1", portainer.PerDevConfigsTypeDir}},
			},
			want: []DirEntry{baseDirEntries[0], baseDirEntries[1], baseDirEntries[2], baseDirEntries[5], baseDirEntries[6]},
		},
		{
			name: "filter file1 and folder1",
			args: args{
				baseDirEntries,
				"configs",
				MultiFilterArgs{{"folder1", portainer.PerDevConfigsTypeDir}},
			},
			want: []DirEntry{baseDirEntries[0], baseDirEntries[1], baseDirEntries[2], baseDirEntries[5], baseDirEntries[6]},
		},
		{
			name: "filter file1 and file2",
			args: args{
				baseDirEntries,
				"configs",
				MultiFilterArgs{
					{"file1", portainer.PerDevConfigsTypeFile},
					{"file2", portainer.PerDevConfigsTypeFile},
				},
			},
			want: []DirEntry{baseDirEntries[0], baseDirEntries[1], baseDirEntries[2], baseDirEntries[3], baseDirEntries[4]},
		},
		{
			name: "filter folder1 and folder2",
			args: args{
				baseDirEntries,
				"configs",
				MultiFilterArgs{
					{"folder1", portainer.PerDevConfigsTypeDir},
					{"folder2", portainer.PerDevConfigsTypeDir},
				},
			},
			want: []DirEntry{baseDirEntries[0], baseDirEntries[1], baseDirEntries[2], baseDirEntries[5], baseDirEntries[6], baseDirEntries[7], baseDirEntries[8]},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assert.Equalf(t, tt.want, MultiFilterDirForPerDevConfigs(tt.args.dirEntries, tt.args.configPath, tt.args.multiFilterArgs), "MultiFilterDirForPerDevConfigs(%v, %v, %v)", tt.args.dirEntries, tt.args.configPath, tt.args.multiFilterArgs)
		})
	}
}

func TestIsInConfigDir(t *testing.T) {
	f := func(dirEntry DirEntry, configPath string, expect bool) {
		t.Helper()

		actual := isInConfigDir(dirEntry, configPath)
		assert.Equal(t, expect, actual)
	}

	f(DirEntry{Name: "edge-configs"}, "edge-configs", false)
	f(DirEntry{Name: "edge-configs_backup"}, "edge-configs", false)
	f(DirEntry{Name: "edge-configs/standalone-edge-agent-standard"}, "edge-configs", true)
	f(DirEntry{Name: "parent/edge-configs/"}, "edge-configs", false)
	f(DirEntry{Name: "edgestacktest"}, "edgestacktest/edge-configs", false)
	f(DirEntry{Name: "edgestacktest/edgeconfigs-test.yaml"}, "edgestacktest/edge-configs", false)
	f(DirEntry{Name: "edgestacktest/file1.conf"}, "edgestacktest/edge-configs", false)
	f(DirEntry{Name: "edgeconfigs-test.yaml"}, "edgestacktest/edge-configs", false)
	f(DirEntry{Name: "edgestacktest/edge-configs"}, "edgestacktest/edge-configs", false)
	f(DirEntry{Name: "edgestacktest/edge-configs/standalone-edge-agent-async"}, "edgestacktest/edge-configs", true)
	f(DirEntry{Name: "edgestacktest/edge-configs/abc.txt"}, "edgestacktest/edge-configs", true)
}
