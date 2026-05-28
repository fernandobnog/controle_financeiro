---
name: "Security and Financial Rules"
description: "Use quando trabalhar com cálculos financeiros, sanitização, validação, prevenção de SQL Injection e XSS, tratamento de exceções, fail-fast ou fluxos que consumam saída de OCR."
---

# Segurança e Cálculo Financeiro

- Trate toda saída de OCR como entrada não confiável.
- Sanitize dados antes de renderizar, persistir ou reutilizar em prompts e relatórios.
- Nunca interpolar valores diretamente em SQL; use sempre parâmetros.
- Encapsule chamadas de I/O e integrações externas com tratamento explícito de erro.
- Em falhas graves, pare o fluxo com segurança, registre o incidente internamente e devolva mensagens neutras ao usuário final.
- Padronize cálculos financeiros com precisão decimal e arredondamento consistente entre frontend e backend.
- Em qualquer regra de negócio, deixe explícitas premissas, limites e fórmulas usadas no cálculo.