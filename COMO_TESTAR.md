# 🚀 Script para testar o sistema localmente

## 📋 **Como testar:**

### **1. Instalar Netlify CLI (se não tiver):**
```bash
npm install -g netlify-cli
```

### **2. Rodar o projeto com Netlify Dev:**
```bash
netlify dev
```

### **3. Testar os cenários:**

#### **Cenário A: Usuário Premium (você)**
- **Email:** `vasculargabriel@gmail.com`
- **Senha:** qualquer uma
- **Resultado esperado:** 
  - ✅ Mensagem: "Bem-vindo de volta! Seu plano Premium está ativo!"
  - ✅ Plano: Premium
  - ✅ Acesso completo

#### **Cenário B: Usuário Trial**
- **Email:** `teste@exemplo.com`
- **Senha:** qualquer uma
- **Resultado esperado:**
  - ✅ Mensagem: "Bem-vindo! Você está no Trial Gratuito"
  - ✅ Plano: Trial
  - ✅ 7 dias de teste

#### **Cenário C: Testar API**
- **URL:** `http://localhost:8888/.netlify/functions/verificar-usuario?email=vasculargabriel@gmail.com`
- **Resultado esperado:**
  ```json
  {
    "email": "vasculargabriel@gmail.com",
    "premium": true,
    "plano": "premium",
    "status": "success"
  }
  ```

### **4. Verificar no Console:**
Abra o Console do navegador (F12) e verifique se aparecem:
- 🔐 "Verificando usuário: [email]"
- 💎 "Usuário Premium detectado localmente!" (para seu email)
- 🌐 "Tentando verificar via API Netlify..." (para outros emails)
- 📊 "Resposta da API: [dados]" (se API funcionar)

### **5. Verificar localStorage:**
No Console, digite:
```javascript
// Verificar dados salvos
console.log('Email:', localStorage.getItem('userEmail'));
console.log('Plano:', localStorage.getItem('userPlano'));
console.log('Premium:', localStorage.getItem('userPremium'));
```

## 🎯 **O que deve funcionar:**

✅ **Login com seu email** → Premium ativo  
✅ **Login com outros emails** → Trial  
✅ **API Netlify** → Responde corretamente  
✅ **Fallback local** → Funciona se API falhar  
✅ **Mensagens** → Mostram status correto  

## 🐛 **Se algo não funcionar:**

1. **Verificar se Netlify CLI está instalado**
2. **Verificar se porta 8888 está livre**
3. **Verificar console para erros**
4. **Testar API diretamente no navegador**

---

**Agora é só rodar `netlify dev` e testar! 🚀**
