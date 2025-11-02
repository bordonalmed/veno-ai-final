# 🧪 Guia de Teste Completo - VENO.AI

## ✅ Checklist de Testes

### 🔐 1. TESTE DE AUTENTICAÇÃO (Supabase)

#### Teste 1.1: Criar Nova Conta
- [ ] Acesse a tela de login
- [ ] Clique em "Cadastre-se aqui"
- [ ] Preencha:
  - Email: `teste@exemplo.com`
  - Senha: `123456` (mínimo 6 caracteres)
- [ ] Clique em "Criar Conta"
- [ ] ✅ Deve aparecer: "Cadastro realizado com sucesso!"
- [ ] ✅ Você deve ser redirecionado para a página Home
- [ ] ✅ No console: "✅ Usuário criado no Supabase"

#### Teste 1.2: Verificar no Supabase
- [ ] Acesse: https://app.supabase.com
- [ ] Vá em **Authentication** → **Users**
- [ ] ✅ Deve ver o usuário `teste@exemplo.com`

#### Teste 1.3: Fazer Logout
- [ ] Na página Home, clique em "Sair" ou faça logout
- [ ] ✅ Deve voltar para a página inicial (Landing)
- [ ] ✅ No console: "✅ Logout realizado"

#### Teste 1.4: Fazer Login Novamente
- [ ] Acesse a tela de login
- [ ] Digite o mesmo email e senha
- [ ] Clique em "Entrar"
- [ ] ✅ Deve fazer login com sucesso
- [ ] ✅ Deve entrar na Home
- [ ] ✅ No console: "✅ Login realizado no Supabase"

#### Teste 1.5: Senha Incorreta
- [ ] Na tela de login, digite email correto mas senha errada
- [ ] Clique em "Entrar"
- [ ] ✅ Deve aparecer: "Senha incorreta" ou similar
- [ ] ✅ Não deve entrar no sistema

---

### 📝 2. TESTE DE CRIAÇÃO DE EXAMES

#### Teste 2.1: Criar Exame MMII Venoso
- [ ] Faça login no sistema
- [ ] Na Home, clique em "MMII Venoso"
- [ ] Preencha os dados do exame:
  - Nome do paciente
  - Data
  - Outros campos obrigatórios
- [ ] Clique em "Gerar Laudo" ou "Salvar"
- [ ] ✅ Deve aparecer: "Exame salvo com sucesso!"
- [ ] ✅ No console: "✅ ExamesRealtimeService: Exame criado"

#### Teste 2.2: Verificar Exame Salvo
- [ ] Vá em "Exames Realizados" (no menu)
- [ ] ✅ Deve ver o exame que você acabou de criar
- [ ] ✅ Deve mostrar o nome do paciente, data, tipo de exame

#### Teste 2.3: Criar Outro Tipo de Exame
- [ ] Tente criar um exame de outro tipo (MMII Arterial, MMSS Venoso, etc.)
- [ ] ✅ Deve salvar normalmente
- [ ] ✅ Deve aparecer em "Exames Realizados"

---

### 📄 3. TESTE DE GERAÇÃO DE PDF

#### Teste 3.1: Gerar PDF do Laudo
- [ ] Em qualquer exame criado, clique em "Gerar PDF" ou "Baixar"
- [ ] ✅ Deve baixar um arquivo PDF
- [ ] ✅ O PDF deve conter os dados do exame
- [ ] ✅ Deve ter o logo do VENO.AI

---

### 🔍 4. TESTE DE NAVEGAÇÃO

#### Teste 4.1: Navegação entre Páginas
- [ ] Teste acessar todas as páginas do menu:
  - [ ] Home
  - [ ] MMII Venoso
  - [ ] MMII Arterial
  - [ ] MMSS Venoso
  - [ ] MMSS Arterial
  - [ ] Carótidas e Vertebrais
  - [ ] Exames Realizados
  - [ ] Configurações
- [ ] ✅ Todas devem carregar sem erros

#### Teste 4.2: Proteção de Rotas
- [ ] Faça logout
- [ ] Tente acessar diretamente: `http://localhost:3000/home`
- [ ] ✅ Deve redirecionar para `/login`
- [ ] ✅ Não deve permitir acesso sem login

---

### 🗄️ 5. TESTE DO SUPABASE

#### Teste 5.1: Verificar Usuários no Supabase
- [ ] Acesse: https://app.supabase.com
- [ ] Vá em **Table Editor** → **users**
- [ ] ✅ Deve ver os usuários cadastrados
- [ ] ✅ Deve ter os campos: email, plano, trial_ativo, etc.

#### Teste 5.2: Verificar Sincronização
- [ ] Faça logout no programa
- [ ] Faça login novamente
- [ ] ✅ Deve manter os dados do usuário
- [ ] ✅ No Supabase, deve ver que o login foi registrado

---

### 🧹 6. TESTE DE LIMPEZA

#### Teste 6.1: Excluir Exame
- [ ] Vá em "Exames Realizados"
- [ ] Clique em excluir um exame
- [ ] ✅ Deve pedir confirmação
- [ ] ✅ Deve remover o exame da lista

---

## ✅ RESULTADOS ESPERADOS

### Console do Navegador (F12)
Você deve ver:
- ✅ "✅ Supabase configurado e conectado!"
- ✅ "✅ Usando Supabase como sistema de autenticação"
- ✅ "✅ Usuário criado no Supabase" (ao cadastrar)
- ✅ "✅ Login realizado no Supabase" (ao fazer login)
- ✅ "Exame salvo com sucesso!" (ao criar exame)
- ❌ **NÃO deve ter** erros do Firebase
- ❌ **NÃO deve ter** erros do MetaMask

### No Supabase
- ✅ Usuários aparecem em Authentication → Users
- ✅ Perfis aparecem em Table Editor → users
- ✅ Dados sincronizados corretamente

---

## 🆘 Se Algo Der Errado

### ❌ Erro ao criar conta
- Verifique se as tabelas foram criadas no Supabase (SQL Editor)
- Veja o erro no console do navegador

### ❌ Exame não aparece em "Exames Realizados"
- Verifique o console do navegador
- Veja se apareceu a mensagem "Exame salvo com sucesso!"

### ❌ Erro no console sobre Firebase
- Certifique-se de que reiniciou o servidor após remover o Firebase
- Limpe o cache do navegador

---

## 🎯 TESTE RÁPIDO (5 minutos)

Se você quer testar rapidamente:

1. ✅ Criar uma conta nova
2. ✅ Fazer logout
3. ✅ Fazer login novamente
4. ✅ Criar um exame (qualquer tipo)
5. ✅ Verificar em "Exames Realizados"
6. ✅ Verificar no Supabase se o usuário aparece

**Se tudo isso funcionar, está 100% OK!** 🎉

---

## 📝 Reportar Problemas

Se encontrar algum problema, anote:
1. O que você estava fazendo
2. Qual erro apareceu (se houver)
3. O que aparece no console (F12)
4. Screenshot (se possível)

---

**👉 Vá testar agora e me diga o que encontrou!** 🚀
