# Jornada do Usuário

Descrição passo a passo do fluxo principal do sistema pelo ponto de vista do usuário final — uma família em processo de recuperação financeira.

## Contexto

O usuário típico é um responsável financeiro da família que está com dívidas acumuladas, não sabe exatamente quanto deve no total, não tem clareza sobre qual dívida priorizar e está buscando um caminho prático para sair do endividamento.

O sistema não exige conhecimento financeiro. Toda a terminologia é explicada em linguagem simples.

---

## Etapa 1 — Cadastro e primeiro acesso

1. O usuário acessa o sistema e clica em **Criar conta**.
2. Informa nome, e-mail e senha.
3. Recebe confirmação de cadastro.
4. Faz login e é redirecionado para a **Página de boas-vindas**.

**O que o sistema garante:**
- Senha nunca armazenada em texto puro.
- Sessão com tempo de expiração.
- Cada conta vê apenas seus próprios dados.

---

## Etapa 2 — Página de boas-vindas

O usuário vê três opções:

| Opção | Quando usar |
|-------|-------------|
| **Enviar documento** | Tem extratos, faturas ou contratos em PDF ou imagem |
| **Preencher manualmente** | Prefere digitar os dados direto |
| **Ver diagnóstico** | Já tem dados cadastrados e quer revisitar |

A opção de enviar documento é destacada como preferencial porque gera diagnóstico mais preciso.

---

## Etapa 3 — Upload de documento

1. O usuário clica em **Enviar documento**.
2. Seleciona o arquivo (PDF ou imagem).
3. O sistema exibe uma barra de progresso enquanto o arquivo é enviado.
4. Após o upload, o sistema informa: *"Documento recebido. A IA está processando — isso pode levar até 2 minutos."*

**Tipos de documento aceitos:**
- Extratos bancários (PDF)
- Faturas de cartão de crédito (PDF)
- Contratos de empréstimo/financiamento (PDF)
- Comprovantes, prints de app bancário (JPG, PNG, WEBP)
- Impressos do DDA — débito automático (PDF)

**O que a IA detecta automaticamente:**
- Rendas (salário, freelance, benefícios, aluguéis)
- Despesas fixas (aluguel, plano de saúde, assinaturas)
- Despesas variáveis (supermercado, combustível, lazer)
- Parcelas de dívidas (cartão, empréstimo, financiamento)
- Dívidas em atraso (juros, multas, cobranças)
- Obrigações de débito automático (DDA)

---

## Etapa 4 — Revisão dos itens extraídos

Após o processamento, o usuário é direcionado para a **tela de revisão**.

A tela mostra todos os itens identificados pela IA, agrupados por categoria:
- Rendas identificadas
- Despesas fixas
- Parcelas de dívida
- Dívidas em atraso
- Itens ambíguos (a IA não teve certeza)

Para cada item, o usuário escolhe:
- ✅ **Confirmar** — o item está correto
- ✏️ **Corrigir** — ajusta valor, descrição ou categoria
- ❌ **Descartar** — o item não é relevante

> O sistema indica o grau de confiança da IA em cada item (Alta / Média / Baixa). Itens com baixa confiança ficam destacados para revisão prioritária.

Após revisar todos os itens, o usuário vê: *"Revisão concluída. Seus dados estão prontos para o diagnóstico."*

---

## Etapa 5 — Diagnóstico financeiro

O usuário acessa o **Dashboard** e vê:

### Narrativa da situação
Uma descrição em linguagem simples explicando a situação atual:
> *"Você está comprometendo 68% da sua renda mensal com dívidas. Isso está acima do limite saudável de 30% e pode indicar dificuldade em honrar os compromissos mensais."*

### Métricas principais
- Renda mensal total
- Pagamento mensal de dívidas
- DTI — percentual da renda comprometida
- Saldo total de dívidas
- Saldo disponível após obrigações

### Alerta de atraso
Se houver dívidas em atraso, um alerta vermelho aparece no topo:
> *"2 dívidas em atraso identificadas. Regularize o quanto antes para evitar encargos adicionais."*

### Próxima ação recomendada
Uma instrução clara e específica para o próximo passo imediato.

---

## Etapa 6 — Plano de quitação de dívidas

O usuário acessa a **tela de Plano** e vê dois caminhos possíveis:

### Método Avalanche
Paga primeiro as dívidas com as maiores taxas de juros.
- **Vantagem:** menor custo total — você paga menos juros no final
- **Indicado para:** quem tem disciplina e quer economizar mais

### Método Bola de Neve
Paga primeiro as dívidas de menor valor.
- **Vantagem:** vitórias rápidas — você quita dívidas menores logo
- **Indicado para:** quem precisa de motivação para manter o ritmo

O sistema indica qual método recomenda para o perfil do usuário e explica o motivo.

Para cada método, o usuário vê:
- Ordem de priorização das dívidas
- Valor sugerido de pagamento mensal por credor
- Estimativa de meses até ficar livre de dívidas
- Total de juros a pagar

---

## Etapa 7 — Orçamento Base Zero (futuro)

Após o plano, o usuário pode organizar os gastos mensais em **envelopes por categoria**, alocando cada real da renda em um destino específico — sem sobras e sem dívidas novas.

---

## Retorno ao sistema

O usuário pode:
- Enviar novos documentos a qualquer momento para atualizar o diagnóstico
- Revisar e corrigir itens já cadastrados
- Acompanhar a evolução do DTI mês a mês
- Exportar o plano em PDF (previsto para versão futura)

---

## Perguntas frequentes do usuário

**"Meu extrato tem muitos lançamentos. A IA vai ler tudo?"**
> Sim. LlamaParse processa toda a página e identifica todos os lançamentos. Você precisa apenas confirmar ou corrigir os itens que a IA não tiver certeza.

**"Posso usar prints de aplicativos bancários?"**
> Sim. O sistema aceita JPG, PNG e WEBP além de PDF.

**"Meus dados ficam seguros?"**
> Sim. Cada conta tem acesso exclusivo aos seus dados. As informações são trafegadas em HTTPS e armazenadas com criptografia. Nenhum dado é compartilhado com terceiros além dos serviços de IA contratados.

**"Preciso ter todos os documentos prontos?"**
> Não. Você pode começar com o que tiver em mãos e adicionar mais documentos depois. O diagnóstico se atualiza automaticamente.

**"O sistema faz negociações com credores?"**
> Não. O sistema ajuda você a entender sua situação e traçar um plano — a negociação com credores é de sua responsabilidade.
