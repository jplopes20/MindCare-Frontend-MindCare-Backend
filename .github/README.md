# Secrets necessários para CI/CD

Este projeto utiliza GitHub Actions para integração contínua e deploy.
Os seguintes secrets devem ser configurados em **Settings → Secrets and variables → Actions** do repositório:

| Secret | Obrigatório | Descrição |
|--------|-------------|-----------|
| `JWT_SECRET` | Sim | Segredo usado para assinar e verificar tokens JWT da autenticação. |
| `RENDER_DEPLOY_HOOK_URL` | Não (opcional) | URL do deploy hook do Render para deploy automático em push para `main`. |

## Como configurar o RENDER_DEPLOY_HOOK_URL

1. Acesse o [Render Dashboard](https://dashboard.render.com/)
2. Abra o serviço desejado → **Settings** → **Deploy Hooks**
3. Clique em **Add Deploy Hook** e copie a URL gerada
4. No GitHub, vá em **Settings → Secrets and variables → Actions**
5. Adicione um novo secret com o nome `RENDER_DEPLOY_HOOK_URL` e cole a URL

> **Nota:** Se o deploy hook não estiver configurado, o workflow de deploy exibirá apenas instruções sem executar o curl.
