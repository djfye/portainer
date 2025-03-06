import { useQuery } from '@tanstack/react-query';

import { EnvironmentId } from '@/react/portainer/environments/types';
import { withGlobalError } from '@/react-tools/react-query';
import PortainerError from 'Portainer/error';
import axios, { parseAxiosError } from '@/portainer/services/axios';

interface HelmRelease {
  name: string;
  chart: string;
  app_version: string;
}
/**
 * List all helm releases based on passed in options
 * @param environmentId - Environment ID
 * @param options - Options for filtering releases
 * @returns List of helm releases
 */
export async function listReleases(
  environmentId: EnvironmentId,
  options: {
    namespace?: string;
    filter?: string;
    selector?: string;
    output?: string;
  } = {}
): Promise<HelmRelease[]> {
  try {
    const { namespace, filter, selector, output } = options;
    const url = `endpoints/${environmentId}/kubernetes/helm`;
    const { data } = await axios.get<HelmRelease[]>(url, {
      params: { namespace, filter, selector, output },
    });
    return data;
  } catch (e) {
    throw parseAxiosError(e as Error, 'Unable to retrieve release list');
  }
}

/**
 * React hook to fetch a specific Helm release
 */
export function useHelmRelease(
  environmentId: EnvironmentId,
  name: string,
  namespace: string
) {
  return useQuery(
    [environmentId, 'helm', namespace, name],
    () => getHelmRelease(environmentId, name, namespace),
    {
      enabled: !!environmentId,
      ...withGlobalError('Unable to retrieve helm application details'),
    }
  );
}

/**
 * Get a specific Helm release
 */
async function getHelmRelease(
  environmentId: EnvironmentId,
  name: string,
  namespace: string
): Promise<HelmRelease> {
  try {
    const releases = await listReleases(environmentId, {
      filter: `^${name}$`,
      namespace,
    });

    if (releases.length > 0) {
      return releases[0];
    }

    throw new PortainerError(`Release ${name} not found`);
  } catch (err) {
    throw new PortainerError(
      'Unable to retrieve helm application details',
      err as Error
    );
  }
}
