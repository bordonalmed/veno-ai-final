# 📧 CONFIGURAR GMAIL PARA ENVIO DE EMAILS

## **USANDO ADMIN@VENOAI.XYZ**

### **PASSO 1: ATIVAR VERIFICAÇÃO DE 2 ETAPAS**

1. **Acesse sua conta Gmail:**
   - Vá para: https://myaccount.google.com/
   - Faça login com admin@venoai.xyz

2. **Ative a verificação de 2 etapas:**
   - Clique em "Segurança"
   - Procure por "Verificação de duas etapas"
   - Clique em "Começar"
   - Siga as instruções para ativar

### **PASSO 2: GERAR SENHA DE APP**

1. **Acesse as senhas de app:**
   - Vá para: https://myaccount.google.com/apppasswords
   - Ou: Segurança > Verificação de duas etapas > Senhas de app

2. **Criar nova senha de app:**
   - Clique em "Selecionar app" > "Outro (nome personalizado)"
   - Digite: "VENO.AI Sistema"
   - Clique em "Gerar"

3. **Copie a senha gerada:**
   - Exemplo: `abcd efgh ijkl mnop`
   - **IMPORTANTE:** Copie exatamente como aparece

### **PASSO 3: CONFIGURAR NO SISTEMA**

1. **Criar arquivo .env.local:**
   ```
   REACT_APP_GMAIL_PASSWORD=sua_senha_de_app_aqui
   ```

2. **Substituir no código:**
   - Abra `src/services/emailService.js`
   - Substitua `'sua_senha_de_app_aqui'` pela senha real

### **PASSO 4: TESTAR**

1. **Fazer build:**
   ```bash
   npm run build
   ```

2. **Fazer deploy:**
   ```bash
   git add .
   git commit -m "feat: configurar envio de emails via Gmail"
   git push origin master
   ```

3. **Testar no site:**
   - Acesse: https://venoai.xyz
   - Digite qualquer email
   - Verifique se o email chega

## **TROUBLESHOOTING:**

### **Se der erro "Invalid login":**
- Verifique se a verificação de 2 etapas está ativa
- Verifique se a senha de app está correta
- Tente gerar uma nova senha de app

### **Se der erro "Less secure app":**
- Gmail não permite mais apps menos seguros
- Use senhas de app (método acima)

### **Se não chegar email:**
- Verifique a caixa de spam
- Verifique se o email está correto
- Verifique os logs no console

## **EXEMPLO DE CONFIGURAÇÃO:**

```javascript
// Em src/services/emailService.js
const transporter = nodemailer.createTransporter({
  service: 'gmail',
  auth: {
    user: 'admin@venoai.xyz',
    pass: 'abcd efgh ijkl mnop' // Sua senha de app aqui
  }
});
```

## **PRÓXIMOS PASSOS:**

1. **Siga os passos** acima
2. **Me diga** se conseguiu gerar a senha de app
3. **Vou ajudar** a configurar no código
4. **Sistema funcionará** com emails reais!

## **IMPORTANTE:**
- ✅ Use senhas de app (não a senha normal)
- ✅ Mantenha a senha segura
- ✅ Não compartilhe a senha
- ✅ Teste antes de fazer deploy
