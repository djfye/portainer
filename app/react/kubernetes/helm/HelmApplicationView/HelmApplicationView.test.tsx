import { render, screen } from '@testing-library/react';
import { HttpResponse } from 'msw';

import { withTestQueryProvider } from '@/react/test-utils/withTestQuery';
import { server, http } from '@/setup-tests/server';
import { withTestRouter } from '@/react/test-utils/withRouter';
import { UserViewModel } from '@/portainer/models/user';
import { withUserProvider } from '@/react/test-utils/withUserProvider';

import { HelmApplicationView } from './HelmApplicationView';

// Mock the necessary hooks and dependencies
const mockUseCurrentStateAndParams = vi.fn();
const mockUseEnvironmentId = vi.fn();

vi.mock('@uirouter/react', async (importOriginal: () => Promise<object>) => ({
  ...(await importOriginal()),
  useCurrentStateAndParams: () => mockUseCurrentStateAndParams(),
}));

vi.mock('@/react/hooks/useEnvironmentId', () => ({
  useEnvironmentId: () => mockUseEnvironmentId(),
}));

function renderComponent() {
  const user = new UserViewModel({ Username: 'user' });
  const Wrapped = withTestQueryProvider(
    withUserProvider(withTestRouter(HelmApplicationView), user)
  );
  return render(<Wrapped />);
}

describe('HelmApplicationView', () => {
  beforeEach(() => {
    // Set up default mock values
    mockUseEnvironmentId.mockReturnValue(3);
    mockUseCurrentStateAndParams.mockReturnValue({
      params: {
        name: 'test-release',
        namespace: 'default',
      },
    });

    // Set up default mock API responses
    server.use(
      http.get('/api/endpoints/3/kubernetes/helm', () =>
        HttpResponse.json([
          {
            name: 'test-release',
            chart: 'test-chart-1.0.0',
            app_version: '1.0.0',
          },
        ])
      )
    );
  });

  it('should display helm release details when data is loaded', async () => {
    renderComponent();

    // Check for the page header
    expect(await screen.findByText('Helm details')).toBeInTheDocument();

    // Check for the release details
    expect(screen.getByText('Release')).toBeInTheDocument();

    // Check for the table content
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Chart')).toBeInTheDocument();
    expect(screen.getByText('App version')).toBeInTheDocument();

    // Check for the actual values
    expect(screen.getByTestId('k8sAppDetail-appName')).toHaveTextContent(
      'test-release'
    );
    expect(screen.getByText('test-chart-1.0.0')).toBeInTheDocument();
    expect(screen.getByText('1.0.0')).toBeInTheDocument();
  });

  it('should display error message when API request fails', async () => {
    // Mock API failure
    server.use(
      http.get('/api/endpoints/3/kubernetes/helm', () => HttpResponse.error())
    );

    // Mock console.error to prevent test output pollution
    vi.spyOn(console, 'error').mockImplementation(() => {});

    renderComponent();

    // Wait for the error message to appear
    expect(
      await screen.findByText('Failed to load Helm application details')
    ).toBeInTheDocument();

    // Restore console.error
    vi.spyOn(console, 'error').mockRestore();
  });

  it('should display error message when release is not found', async () => {
    // Mock empty response (no releases found)
    server.use(
      http.get('/api/endpoints/3/kubernetes/helm', () => HttpResponse.json([]))
    );

    // Mock console.error to prevent test output pollution
    vi.spyOn(console, 'error').mockImplementation(() => {});

    renderComponent();

    // Wait for the error message to appear
    expect(
      await screen.findByText('Failed to load Helm application details')
    ).toBeInTheDocument();

    // Restore console.error
    vi.spyOn(console, 'error').mockRestore();
  });
});
