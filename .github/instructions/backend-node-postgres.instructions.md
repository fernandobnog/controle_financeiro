---
name: "Backend Node Postgres"
description: "Use quando implementar API Node.js, regras de DTI, avalanche, bola de neve, ingestão de OCR, persistência em PostgreSQL ou integrações mockadas com LlamaParse e Rails."
---

# Backend Node.js e PostgreSQL

- Separe responsabilidades entre validação de entrada, regras de negócio, acesso a dados e integração externa.
- Trate cálculos financeiros com `currency.js`, `decimal.js` ou biblioteca equivalente de precisão decimal.
- Nunca use aritmética de ponto flutuante nativa para valores monetários, juros, parcelas ou percentuais financeiros.
- Toda consulta ao PostgreSQL deve usar parameterized queries ou statements preparados.
- Considere todo payload de OCR e todo input de usuário como não confiável; sanitize e valide antes de persistir ou retornar.
- Faça fail-fast em dados inconsistentes e devolva mensagens seguras ao cliente.
- Registre falhas internas com contexto suficiente para auditoria sem vazar detalhes sensíveis na resposta HTTP.
- Em testes, mocke LlamaParse, Cognee e o servidor Rails isolado sempre que o objetivo não for integração explícita.
- Projete a API para caber no orçamento total da stack; no desenvolvimento padrão o serviço não deve depender de mais que sua fatia de CPU e RAM.
- Para coleções grandes, use paginação, cursores, stream ou processamento em lotes; não carregue tudo em memória.
- Faça filtros, projeções e ordenações no PostgreSQL sempre que possível para reduzir consumo de CPU e RAM da aplicação.
- Evite materializar OCR bruto, arquivos inteiros ou payloads extensos em memória do Node quando houver alternativa incremental.