import { DefaultBodyType, HttpResponse } from 'msw';
import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { UserViewModel } from '@/portainer/models/user';
import { withUserProvider } from '@/react/test-utils/withUserProvider';
import { withTestRouter } from '@/react/test-utils/withRouter';
import { withTestQueryProvider } from '@/react/test-utils/withTestQuery';
import { http, server } from '@/setup-tests/server';
import selectEvent from '@/react/test-utils/react-select';

import { CreateForm } from './CreateForm';

// browser address
// /edge/stacks/new?templateId=54&templateType=app
vi.mock('@uirouter/react', async (importOriginal: () => Promise<object>) => ({
  ...(await importOriginal()),
  useCurrentStateAndParams: vi.fn(() => ({
    params: { templateId: 54, templateType: 'app' },
  })),
}));

vi.mock('@uiw/react-codemirror', () => ({
  __esModule: true,
  default: () => <div />,
}));

// app templates request
// GET /api/templates
const templatesResponseBody = {
  version: '3',
  templates: [
    {
      id: 54,
      type: 3,
      title: 'TOSIBOX Lock for Container',
      description:
        'Lock for Container brings secure connectivity inside your industrial IoT devices',
      administrator_only: false,
      image: '',
      repository: {
        url: 'https://github.com/portainer/templates',
        stackfile: 'stacks/tosibox/docker-compose.yml',
      },
      stackFile: '',
      logo: 'https://portainer-io-assets.sfo2.digitaloceanspaces.com/logos/tosibox.png',
      env: [
        {
          name: 'LICENSE_KEY',
          label: 'License key',
        },
      ],
      platform: 'linux',
      categories: ['edge'],
    },
  ],
};

// app template content request
// GET /api/templates/54/file
const templateContentResponseBody = {
  FileContent:
    // eslint-disable-next-line no-template-curly-in-string
    'version: "3.7"\nservices:\n  tosibox-lock-for-container:\n    container_name: tosibox-lock-for-container\n    image: tosibox/lock-for-container:latest\n    hostname: tb-lfc\n    restart: unless-stopped\n    cap_add:\n      - NET_ADMIN\n      - SYS_TIME\n      - SYS_PTRACE\n    ports:\n      - 80\n    networks:\n      - tbnet\n    volumes:\n      - tosibox-lfc:/etc/tosibox/docker_volume\n    environment:\n      - LICENSE_KEY=${LICENSE_KEY}\nvolumes:\n  tosibox-lfc:\n    name: tosibox-lfc\nnetworks:\n  tbnet:\n    name: tbnet\n    ipam:\n      config:\n        - subnet: 10.10.206.0/24\n',
};

// edge groups
const edgeGroups = [
  {
    Id: 1,
    Name: 'docker',
    Dynamic: false,
    TagIds: [],
    Endpoints: [12],
    PartialMatch: false,
    HasEdgeStack: false,
    HasEdgeJob: false,
    EndpointTypes: [4],
    TrustedEndpoints: [12],
  },
  {
    Id: 2,
    Name: 'kubernetes',
    Dynamic: false,
    TagIds: [],
    Endpoints: [11],
    PartialMatch: false,
    HasEdgeStack: false,
    HasEdgeJob: false,
    EndpointTypes: [7],
    TrustedEndpoints: [11],
  },
];

// expected form values
const expectedPayload = {
  deploymentType: 0,
  edgeGroups: [1],
  name: 'my-stack',
  envVars: [{ name: 'LICENSE_KEY', value: 'license-123' }],
  prePullImage: false,
  registries: [],
  retryDeploy: false,
  staggerConfig: {
    StaggerOption: 1,
    StaggerParallelOption: 1,
    DeviceNumber: 1,
    DeviceNumberStartFrom: 0,
    DeviceNumberIncrementBy: 2,
    Timeout: '',
    UpdateDelay: '',
    UpdateFailureAction: 1,
  },
  useManifestNamespaces: false,
  stackFileContent:
    // eslint-disable-next-line no-template-curly-in-string
    'version: "3.7"\nservices:\n  tosibox-lock-for-container:\n    container_name: tosibox-lock-for-container\n    image: tosibox/lock-for-container:latest\n    hostname: tb-lfc\n    restart: unless-stopped\n    cap_add:\n      - NET_ADMIN\n      - SYS_TIME\n      - SYS_PTRACE\n    ports:\n      - 80\n    networks:\n      - tbnet\n    volumes:\n      - tosibox-lfc:/etc/tosibox/docker_volume\n    environment:\n      - LICENSE_KEY=${LICENSE_KEY}\nvolumes:\n  tosibox-lfc:\n    name: tosibox-lfc\nnetworks:\n  tbnet:\n    name: tbnet\n    ipam:\n      config:\n        - subnet: 10.10.206.0/24\n',
};

function renderCreateForm() {
  server.use(
    http.get('/api/templates', () => HttpResponse.json(templatesResponseBody))
  );
  server.use(
    http.post('/api/templates/54/file', () =>
      HttpResponse.json(templateContentResponseBody)
    )
  );
  server.use(http.get('/api/edge_stacks', () => HttpResponse.json([])));
  server.use(http.get('/api/edge_groups', () => HttpResponse.json(edgeGroups)));
  server.use(http.get('/api/registries', () => HttpResponse.json([])));
  server.use(http.get('/api/custom_templates', () => HttpResponse.json([])));

  const user = new UserViewModel({ Username: 'user' });
  const Wrapped = withTestQueryProvider(
    withUserProvider(withTestRouter(CreateForm), user)
  );
  return render(<Wrapped />);
}

test('The web editor should be visible for app templates', async () => {
  const { getByRole, getByLabelText } = renderCreateForm();

  // Wait for the form to be rendered
  await waitFor(() => {
    expect(getByRole('form')).toBeInTheDocument();
  });

  // the web editor should be visible
  expect(getByLabelText('Web editor')).toBeVisible();
});

test('The form should submit the correct request body', async () => {
  let requestBody: DefaultBodyType;

  server.use(
    http.post('/api/edge_stacks/create/string', async ({ request }) => {
      requestBody = await request.json();
      return HttpResponse.json({});
    })
  );

  const { getByRole, getByLabelText } = renderCreateForm();

  await waitFor(() => {
    expect(getByRole('form')).toBeInTheDocument();
  });

  // fill in the name and select the docker edge group
  const user = userEvent.setup();
  await user.type(getByRole('textbox', { name: 'Name *' }), 'my-stack');
  await user.type(
    getByRole('textbox', { name: 'License key *' }),
    'license-123'
  );
  const selectElement = getByLabelText('Edge groups');
  await selectEvent.select(selectElement, 'docker');

  // submit the form
  await user.click(getByRole('button', { name: /Deploy the stack/i }));

  // verify the request body
  await waitFor(() => {
    expect(requestBody).toEqual(expectedPayload);
  });
});
