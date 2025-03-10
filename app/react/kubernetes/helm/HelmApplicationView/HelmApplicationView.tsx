import { useCurrentStateAndParams } from '@uirouter/react';

import { PageHeader } from '@/react/components/PageHeader';
import { Widget, WidgetBody, WidgetTitle } from '@/react/components/Widget';
import helm from '@/assets/ico/vendor/helm.svg?c';
import { useEnvironmentId } from '@/react/hooks/useEnvironmentId';

import { ViewLoading } from '@@/ViewLoading';
import { Alert } from '@@/Alert';

import { useHelmRelease } from './queries/useHelmRelease';

export function HelmApplicationView() {
  const { params } = useCurrentStateAndParams();
  const environmentId = useEnvironmentId();

  const name = params.name as string;
  const namespace = params.namespace as string;

  const {
    data: release,
    isLoading,
    error,
  } = useHelmRelease(environmentId, name, namespace);

  if (isLoading) {
    return <ViewLoading />;
  }

  if (error || !release) {
    return (
      <Alert color="error" title="Failed to load Helm application details" />
    );
  }

  return (
    <>
      <PageHeader
        title="Helm details"
        breadcrumbs={[
          { label: 'Applications', link: 'kubernetes.applications' },
          name,
        ]}
        reload
      />

      <div className="row">
        <div className="col-sm-12">
          <Widget>
            <WidgetTitle icon={helm} title="Release" />
            <WidgetBody>
              <table className="table">
                <tbody>
                  <tr>
                    <td className="!border-none w-40">Name</td>
                    <td
                      className="!border-none min-w-[140px]"
                      data-cy="k8sAppDetail-appName"
                    >
                      {release.name}
                    </td>
                  </tr>
                  <tr>
                    <td className="!border-t">Chart</td>
                    <td className="!border-t">{release.chart}</td>
                  </tr>
                  <tr>
                    <td>App version</td>
                    <td>{release.app_version}</td>
                  </tr>
                </tbody>
              </table>
            </WidgetBody>
          </Widget>
        </div>
      </div>
    </>
  );
}
