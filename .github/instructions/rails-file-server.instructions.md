---
name: "Rails File Server"
description: "Use quando criar ou editar o servidor Ruby on Rails isolado para upload, armazenamento, recuperação de documentos, anexos, metadados e fluxo seguro de arquivos."
---

# Servidor de Arquivos em Rails

- Mantenha o servidor Rails isolado da lógica de decisão financeira; ele deve cuidar de upload, armazenamento e acesso controlado a documentos.
- Siga convenções idiomáticas de Rails e mantenha o código compatível com RuboCop.
- Valide tipo MIME, extensão, tamanho e origem dos arquivos antes de persistir.
- Nunca exponha caminhos internos de armazenamento ou credenciais em respostas públicas.
- Prefira URLs assinadas, tokens temporários ou mecanismos equivalentes para acesso a arquivos.
- Registre eventos relevantes de upload, falha, exclusão e leitura para trilha de auditoria.