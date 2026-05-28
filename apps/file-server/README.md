# File Server — Servidor de Arquivos

Servidor isolado em Ruby on Rails 8 (modo API) responsável exclusivamente pelo upload, armazenamento, recuperação e metadados de documentos financeiros.

## Responsabilidades

- Receber uploads de PDFs e imagens via `multipart/form-data`.
- Armazenar arquivos via Active Storage (local/disk em dev, object storage em prod).
- Retornar `receipt` com URL de acesso e metadados básicos.
- Servir arquivos com autenticação prévia — sem URLs públicas sem token.
- Nunca processar o conteúdo do arquivo (OCR, classificação, etc.).

## Autenticação

Toda requisição ao file server deve incluir o header `Authorization: Bearer <token>`. O token é o mesmo `APP_AUTH_SECRET` compartilhado com a API principal via HMAC-SHA256. Requisições sem token ou com token inválido retornam `401 Unauthorized`.

## Contrato de API

### POST /api/documents

Upload de um novo documento.

**Headers:**
```
Authorization: Bearer <APP_AUTH_SECRET>
Content-Type: multipart/form-data
```

**Campos do form:**
| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `file` | File | Sim | Arquivo PDF ou imagem |
| `household_id` | string | Sim | ID da unidade familiar |

**Limites:**
- Tamanho máximo: 10 MB por arquivo
- MIME types aceitos: `application/pdf`, `image/jpeg`, `image/png`, `image/webp`, `image/tiff`
- O servidor valida MIME type por assinatura de arquivo (magic bytes), não apenas pela extensão

**Resposta 201:**
```json
{
  "id": "uuid",
  "household_id": "uuid",
  "filename": "extrato-jan-2025.pdf",
  "content_type": "application/pdf",
  "byte_size": 204800,
  "url": "/api/documents/uuid/download",
  "created_at": "2025-01-15T10:00:00Z"
}
```

### GET /api/documents/:id/download

Download do arquivo original.

**Headers:**
```
Authorization: Bearer <APP_AUTH_SECRET>
```

**Resposta:** arquivo binário com `Content-Disposition: attachment`.

### DELETE /api/documents/:id

Remove o arquivo e seus metadados.

**Headers:**
```
Authorization: Bearer <APP_AUTH_SECRET>
```

**Resposta 204:** sem corpo.

## Armazenamento

| Ambiente | Provedor |
|----------|----------|
| Desenvolvimento | `local` (disco — `storage/`) |
| Teste | `test` (memória) |
| Produção | `local` ou object storage (S3-compatible via MinIO) |

## Segurança

- Validação de MIME type por conteúdo (não apenas extensão).
- Path traversal bloqueado — nenhum parâmetro de caminho é aceito como entrada de arquivo.
- Sem listagem de diretórios e sem exposição de URLs diretas de storage.
- Logs não incluem conteúdo de arquivos ou tokens.
- Remoção de arquivo não expõe se o ID existia ou não (resposta uniforme `204`).

## Desenvolvimento local

```bash
cd apps/file-server
bundle install
bin/setup
bin/rails server -p 3002
```

Ou via Docker Compose:
```bash
docker compose -f infra/compose/compose.base.yaml -f infra/compose/compose.dev.yaml up file-server
```

## Testes

```bash
cd apps/file-server
bin/rails test
```
