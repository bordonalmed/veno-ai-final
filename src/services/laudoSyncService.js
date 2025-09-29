// Serviço para sincronizar laudos com Firebase
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  doc,
  updateDoc,
  deleteDoc
} from 'firebase/firestore';
import { db, auth } from '../config/firebase';

class LaudoSyncService {
  constructor() {
    this.currentUser = null;
  }

  // Obter usuário atual
  getCurrentUser() {
    return auth.currentUser;
  }

  // Salvar laudo no Firebase
  async salvarLaudo(laudoData) {
    try {
      console.log('🔥 LaudoSyncService: Iniciando salvamento...', laudoData);
      
      const user = this.getCurrentUser();
      if (!user) {
        console.error('❌ LaudoSyncService: Usuário não logado');
        throw new Error('Usuário não logado');
      }

      console.log('✅ LaudoSyncService: Usuário logado:', user.email, user.uid);

      const laudoCompleto = {
        ...laudoData,
        userId: user.uid,
        userEmail: user.email,
        dataCriacao: new Date().toISOString(),
        dataModificacao: new Date().toISOString()
      };

      console.log('📝 LaudoSyncService: Salvando no Firebase...', laudoCompleto);

      // Salvar no Firebase
      const docRef = await addDoc(collection(db, 'laudos'), laudoCompleto);
      
      console.log('✅ LaudoSyncService: Laudo salvo no Firebase com ID:', docRef.id);
      
      // Também salvar localmente para compatibilidade
      this.salvarLocalmente(laudoData);
      
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('❌ LaudoSyncService: Erro ao salvar laudo no Firebase:', error);
      // Fallback: salvar apenas localmente
      this.salvarLocalmente(laudoData);
      return { success: false, error: error.message };
    }
  }

  // Salvar localmente (fallback)
  salvarLocalmente(laudoData) {
    try {
      const storageKey = `exames${laudoData.tipoNome?.replace(/\s+/g, '') || 'Laudo'}`;
      const examesExistentes = JSON.parse(localStorage.getItem(storageKey) || "[]");
      
      const novoExame = {
        ...laudoData,
        id: Date.now().toString(),
        timestamp: new Date().toISOString()
      };
      
      examesExistentes.push(novoExame);
      localStorage.setItem(storageKey, JSON.stringify(examesExistentes));
      
      console.log('Laudo salvo localmente:', storageKey);
    } catch (error) {
      console.error('Erro ao salvar localmente:', error);
    }
  }

  // Buscar laudos do usuário
  async buscarLaudos() {
    try {
      console.log('🔍 LaudoSyncService: Buscando laudos...');
      
      const user = this.getCurrentUser();
      if (!user) {
        console.error('❌ LaudoSyncService: Usuário não logado');
        throw new Error('Usuário não logado');
      }

      console.log('✅ LaudoSyncService: Usuário logado:', user.email, user.uid);

      const q = query(
        collection(db, 'laudos'),
        where('userId', '==', user.uid),
        orderBy('dataCriacao', 'desc')
      );

      console.log('📖 LaudoSyncService: Executando query...');
      const querySnapshot = await getDocs(q);
      const laudos = [];

      querySnapshot.forEach((doc) => {
        laudos.push({
          id: doc.id,
          ...doc.data()
        });
      });

      console.log('✅ LaudoSyncService: Laudos carregados do Firebase:', laudos.length);
      return { success: true, laudos };
    } catch (error) {
      console.error('❌ LaudoSyncService: Erro ao buscar laudos:', error);
      // Fallback: buscar localmente
      return this.buscarLaudosLocais();
    }
  }

  // Buscar laudos locais (fallback)
  buscarLaudosLocais() {
    try {
      const tiposLaudo = [
        'examesMMIIVenoso',
        'examesMMIIArterial', 
        'examesMMSSVenoso',
        'examesMMSSArterial',
        'examesCarotidasVertebrais'
      ];

      const todosLaudos = [];
      
      tiposLaudo.forEach(tipo => {
        const laudos = JSON.parse(localStorage.getItem(tipo) || "[]");
        laudos.forEach(laudo => {
          todosLaudos.push({
            ...laudo,
            tipo: tipo,
            origem: 'local'
          });
        });
      });

      console.log('Laudos carregados localmente:', todosLaudos.length);
      return { success: true, laudos: todosLaudos };
    } catch (error) {
      console.error('Erro ao buscar laudos locais:', error);
      return { success: false, laudos: [] };
    }
  }

  // Sincronizar laudos locais com Firebase
  async sincronizarLaudosLocais() {
    try {
      const user = this.getCurrentUser();
      if (!user) {
        console.log('Usuário não logado, pulando sincronização');
        return;
      }

      const tiposLaudo = [
        'examesMMIIVenoso',
        'examesMMIIArterial', 
        'examesMMSSVenoso',
        'examesMMSSArterial',
        'examesCarotidasVertebrais'
      ];

      let sincronizados = 0;

      for (const tipo of tiposLaudo) {
        const laudos = JSON.parse(localStorage.getItem(tipo) || "[]");
        
        for (const laudo of laudos) {
          // Verificar se já existe no Firebase
          const laudoCompleto = {
            ...laudo,
            userId: user.uid,
            userEmail: user.email,
            tipo: tipo,
            origem: 'sincronizado',
            dataCriacao: laudo.timestamp || new Date().toISOString(),
            dataModificacao: new Date().toISOString()
          };

          await addDoc(collection(db, 'laudos'), laudoCompleto);
          sincronizados++;
        }
      }

      console.log(`Sincronizados ${sincronizados} laudos com Firebase`);
      return { success: true, sincronizados };
    } catch (error) {
      console.error('Erro na sincronização:', error);
      return { success: false, error: error.message };
    }
  }

  // Deletar laudo
  async deletarLaudo(laudoId) {
    try {
      const user = this.getCurrentUser();
      if (!user) {
        throw new Error('Usuário não logado');
      }

      await deleteDoc(doc(db, 'laudos', laudoId));
      console.log('Laudo deletado do Firebase:', laudoId);
      
      return { success: true };
    } catch (error) {
      console.error('Erro ao deletar laudo:', error);
      return { success: false, error: error.message };
    }
  }
}

// Criar instância única do serviço
const laudoSyncService = new LaudoSyncService();

export default laudoSyncService;
