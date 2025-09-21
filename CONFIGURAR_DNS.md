# 🌐 Configuração de DNS - venoai.xyz

## 🎯 **Configuração para Netlify:**

### **1. Registros DNS Necessários:**

#### **Registro A (Principal):**
```
Tipo: A
Nome: @
Valor: 75.2.60.5
TTL: 3600
```

#### **Registro CNAME (www):**
```
Tipo: CNAME
Nome: www
Valor: venoai.xyz
TTL: 3600
```

### **2. Provedores de Domínio:**

#### **GoDaddy:**
1. Acesse: https://dcc.godaddy.com
2. Selecione: `venoai.xyz`
3. Clique em "DNS"
4. Adicione os registros acima

#### **Namecheap:**
1. Acesse: https://ap.www.namecheap.com
2. Selecione: `venoai.xyz`
3. Clique em "Advanced DNS"
4. Adicione os registros acima

#### **Registro.br:**
1. Acesse: https://registro.br
2. Selecione: `venoai.xyz`
3. Clique em "DNS"
4. Adicione os registros acima

### **3. Verificação no Netlify:**

#### **A. Adicionar Domínio:**
1. Acesse: https://netlify.com
2. Selecione seu site
3. Vá em "Domain management"
4. Clique em "Add custom domain"
5. Digite: `venoai.xyz`

#### **B. Verificar DNS:**
1. Aguarde a verificação (pode levar até 24h)
2. Status deve ficar "Verified"
3. SSL será ativado automaticamente

### **4. Configurações Avançadas:**

#### **A. Subdomínios:**
```
Tipo: CNAME
Nome: api
Valor: venoai.xyz
TTL: 3600
```

#### **B. Email:**
```
Tipo: MX
Nome: @
Valor: mail.venoai.xyz
Prioridade: 10
TTL: 3600
```

### **5. Teste de Configuração:**

#### **A. Verificar DNS:**
```bash
# Windows
nslookup venoai.xyz

# Linux/Mac
dig venoai.xyz
```

#### **B. Testar Site:**
- Acesse: https://venoai.xyz
- Deve carregar o VENO.AI
- SSL deve estar ativo (cadeado verde)

### **6. Troubleshooting:**

#### **A. DNS não propagou:**
- Aguarde até 24h
- Use DNS público (8.8.8.8)
- Limpe cache do navegador

#### **B. SSL não ativou:**
- Aguarde até 1h
- Verifique se o domínio está "Verified"
- Force refresh (Ctrl+F5)

#### **C. Site não carrega:**
- Verifique se o build foi feito
- Confira as configurações do Netlify
- Teste em modo incógnito

## ✅ **Checklist de DNS:**

- [ ] Registro A configurado (@ → 75.2.60.5)
- [ ] Registro CNAME configurado (www → venoai.xyz)
- [ ] TTL configurado (3600)
- [ ] Domínio adicionado no Netlify
- [ ] Status "Verified" no Netlify
- [ ] SSL ativado
- [ ] Site carregando corretamente

## 🎯 **URLs Finais:**

- **Site:** https://venoai.xyz
- **www:** https://www.venoai.xyz
- **Netlify:** https://venoai.netlify.app

## 🚀 **Comandos de Teste:**

### **Verificar DNS:**
```bash
# Windows
nslookup venoai.xyz
nslookup www.venoai.xyz

# Linux/Mac
dig venoai.xyz
dig www.venoai.xyz
```

### **Testar Site:**
```bash
# Curl
curl -I https://venoai.xyz

# Ping
ping venoai.xyz
```

**Configuração concluída!** 🎉
