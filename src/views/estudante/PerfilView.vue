<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '../../stores/auth'
import { perfilService } from '../../services/perfil'
import { useToast } from 'primevue/usetoast'
import { useAvatar } from '../../composables/useAvatar'
import PageHeader from '../../components/common/PageHeader.vue'
import Card from 'primevue/card'
import Button from 'primevue/button'
import Password from 'primevue/password'
import Avatar from 'primevue/avatar'
import Dialog from 'primevue/dialog'
import Message from 'primevue/message'
import Skeleton from 'primevue/skeleton'
import Tag from 'primevue/tag'
import Accordion from 'primevue/accordion'
import AccordionPanel from 'primevue/accordionpanel'
import AccordionHeader from 'primevue/accordionheader'
import AccordionContent from 'primevue/accordioncontent'
import Textarea from 'primevue/textarea'
import Checkbox from 'primevue/checkbox'
import ToggleSwitch from 'primevue/toggleswitch'
import type { Perfil } from '../../types/perfil'

const auth = useAuthStore()
const toast = useToast()
const { getAvatarStyle } = useAvatar()

const perfil = ref<Perfil | null>(null)
const loading = ref(false)
const loadingSenha = ref(false)
const loadingBolsista = ref(false)

const formSenha = ref({
  senha_atual: '',
  senha_nova: '',
  senha_nova_confirmacao: ''
})

const formBolsista = ref({
  alergias: '',
  restricoes_alimentares: [] as string[],
  is_ovolactovegetariano: false,
  dias: [] as number[]
})

// Opções de alergias e restrições alimentares
const alergiasOptions = [
  { label: 'Intolerância à lactose', value: 'Intolerância à lactose' },
  { label: 'Glúten', value: 'Glúten' },
  { label: 'Frutos do mar', value: 'Frutos do mar' },
  { label: 'Amendoim', value: 'Amendoim' },
  { label: 'Castanhas', value: 'Castanhas' },
  { label: 'Soja', value: 'Soja' },
  { label: 'Ovos', value: 'Ovos' },
  { label: 'Leite', value: 'Leite' },
  { label: 'Trigo', value: 'Trigo' },
  { label: 'Carne vermelha', value: 'Carne vermelha' },
  { label: 'Carne de porco', value: 'Carne de porco' },
  { label: 'Frango', value: 'Frango' },
  { label: 'Peixe', value: 'Peixe' },
  {label: "Abacaxi", value: "Abacaxi"}
]

// Controle de solicitação de mudança de dias
const temSolicitacaoPendente = ref(false)
const displayMotivoMudanca = ref(false)
const motivoMudanca = ref('')

const diasSemanaOpcoes = [
  { label: 'Segunda', value: 1 },
  { label: 'Terça', value: 2 },
  { label: 'Quarta', value: 3 },
  { label: 'Quinta', value: 4 },
  { label: 'Sexta', value: 5 }
]

const carregarPerfil = async () => {
  loading.value = true
  try {
    perfil.value = await perfilService.obter()
    formBolsista.value.alergias = perfil.value.alergias || ''
    formBolsista.value.restricoes_alimentares = perfil.value.restricoes_alimentares || []
    formBolsista.value.is_ovolactovegetariano = !!perfil.value.is_ovolactovegetariano
    formBolsista.value.dias = perfil.value.dias_cadastrados?.map(d => parseInt(d)) || []

    // Verificar se tem solicitação pendente
    temSolicitacaoPendente.value = !!(perfil.value as any).solicitacao_pendente
  } catch (err) {
    console.error('Erro ao carregar perfil:', err)
    // Fallback para dados do auth store
    if (auth.user) {
      perfil.value = {
        id: auth.user.id,
        nome: auth.user.nome,
        matricula: auth.user.matricula,
        email: auth.user.email || '',
        curso: auth.user.curso ?? undefined,
        turno_refeicao: (auth.user.turno_refeicao as any) ?? undefined,
        turno_aula: (auth.user.turno_aula as any) ?? undefined,
        bolsista: !!auth.user.bolsista,
        foto: auth.user.foto ?? undefined,
        perfil: auth.user.perfil
      }
    } else {
      toast.add({
        severity: 'error',
        summary: 'Erro',
        detail: 'Não foi possível carregar o perfil',
        life: 5000
      })
    }
  } finally {
    loading.value = false
  }
}

const alterarSenha = async () => {
  if (formSenha.value.senha_nova !== formSenha.value.senha_nova_confirmacao) {
    toast.add({
      severity: 'error',
      summary: 'Erro',
      detail: 'As senhas não conferem',
      life: 3000
    })
    return
  }

  loadingSenha.value = true
  try {
    await perfilService.alterarSenha({
      current_password: formSenha.value.senha_atual,
      password: formSenha.value.senha_nova,
      password_confirmation: formSenha.value.senha_nova_confirmacao
    })
    toast.add({
      severity: 'success',
      summary: 'Sucesso!',
      detail: 'Senha alterada com sucesso',
      life: 3000
    })
    formSenha.value = {
      senha_atual: '',
      senha_nova: '',
      senha_nova_confirmacao: ''
    }
  } catch (err: any) {
    toast.add({
      severity: 'error',
      summary: 'Erro',
      detail: err?.response?.data?.message || 'Erro ao alterar senha',
      life: 5000
    })
  } finally {
    loadingSenha.value = false
  }
}

const aceitouTermos = ref(false)
const dialogTermos = ref(false)
const fileParaUpload = ref<File | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

const dispararUpload = () => {
  fileInput.value?.click()
}

const onFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  // Validar tipo de arquivo
  const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif']
  if (!allowedTypes.includes(file.type)) {
    toast.add({
      severity: 'error',
      summary: 'Formato inválido',
      detail: 'Apenas arquivos JPG, PNG e GIF são permitidos',
      life: 5000
    })
    target.value = ''
    return
  }

  // Validar tamanho (5MB)
  const maxSize = 5 * 1024 * 1024 // 5MB
  if (file.size > maxSize) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(2)
    toast.add({
      severity: 'error',
      summary: 'Arquivo muito grande',
      detail: `Arquivo tem ${sizeMB} MB. Tamanho máximo: 5 MB`,
      life: 5000
    })
    target.value = ''
    return
  }

  fileParaUpload.value = file
  
  // Verifica se já aceitou os termos nesta sessão (ou se é necessário mostrar)
  const termosAceitosSessao = sessionStorage.getItem('ri_ifba_termos_foto_aceitos')
  if (termosAceitosSessao === 'true') {
    aceitouTermos.value = true
    uploadFoto()
  } else {
    dialogTermos.value = true
  }
}

const uploadFoto = async () => {
  if (!fileParaUpload.value || !aceitouTermos.value) return

  loading.value = true
  dialogTermos.value = false
  try {
    const novoPerfil = await perfilService.atualizarFoto(fileParaUpload.value)
    perfil.value = novoPerfil
    
    // Armazenar consentimento na sessão para não pedir novamente na mesma navegação
    sessionStorage.setItem('ri_ifba_termos_foto_aceitos', 'true')
    
    // Atualizar também no auth store usando a nova função para garantir reatividade
    auth.updateUserData({ foto: novoPerfil.foto || undefined })

    toast.add({
      severity: 'success',
      summary: 'Sucesso!',
      detail: 'Foto atualizada com sucesso',
      life: 3000
    })
    fileParaUpload.value = null
    if (fileInput.value) fileInput.value.value = ''
  } catch (err: any) {
    toast.add({
      severity: 'error',
      summary: 'Erro',
      detail: err?.response?.data?.message || 'Erro ao enviar foto',
      life: 5000
    })
  } finally {
    loading.value = false
  }
}

const removerFoto = async () => {
  loading.value = true
  try {
    await perfilService.removerFoto()
    if (perfil.value) {
      perfil.value.foto = undefined
    }
    // Atualizar auth store de forma reativa
    auth.updateUserData({ foto: undefined })
    
    toast.add({
      severity: 'success',
      summary: 'Sucesso!',
      detail: 'Foto removida com sucesso',
      life: 3000
    })
  } catch (err: any) {
    toast.add({
      severity: 'error',
      summary: 'Erro',
      detail: err?.response?.data?.message || 'Erro ao remover foto',
      life: 5000
    })
  } finally {
    loading.value = false
  }
}

const salvarDadosBolsista = async () => {
  loadingBolsista.value = true
  try {
    await perfilService.atualizarRestricoesAlimentares({
      restricoes_alimentares: formBolsista.value.restricoes_alimentares,
      alergias: formBolsista.value.alergias || undefined,
      preferencia_alimentar: formBolsista.value.is_ovolactovegetariano ? 'ovolactovegetariano' : 'comum'
    })
    toast.add({
      severity: 'success',
      summary: 'Sucesso!',
      detail: 'Informações de saúde atualizadas',
      life: 3000
    })
  } catch (err: any) {
    toast.add({
      severity: 'error',
      summary: 'Erro',
      detail: err?.response?.data?.message || 'Erro ao atualizar informações',
      life: 5000
    })
  } finally {
    loadingBolsista.value = false
  }
}

const abrirModalMudanca = () => {
  if (temSolicitacaoPendente.value) {
    toast.add({
      severity: 'warn',
      summary: 'Aguarde',
      detail: 'Você já possui uma solicitação pendente. Aguarde a resposta do administrador.',
      life: 5000
    })
    return
  }
  motivoMudanca.value = ''
  displayMotivoMudanca.value = true
}

const solicitarMudancaDias = async () => {
  if (!motivoMudanca.value.trim()) {
    toast.add({
      severity: 'warn',
      summary: 'Atenção',
      detail: 'Por favor, informe o motivo da solicitação.',
      life: 3000
    })
    return
  }

  loadingBolsista.value = true
  try {
    const res = await perfilService.atualizarDiasSemana(formBolsista.value.dias, motivoMudanca.value)
    toast.add({
      severity: 'info',
      summary: 'Solicitação Enviada',
      detail: res.meta?.mensagem || 'Sua solicitação foi enviada para o administrador.',
      life: 5000
    })
    displayMotivoMudanca.value = false
    temSolicitacaoPendente.value = true
  } catch (err: any) {
    toast.add({
      severity: 'error',
      summary: 'Erro',
      detail: err?.response?.data?.message || 'Erro ao solicitar mudança',
      life: 5000
    })
  } finally {
    loadingBolsista.value = false
  }
}

const toggleDia = (value: number) => {
  const index = formBolsista.value.dias.indexOf(value)
  if (index === -1) {
    formBolsista.value.dias.push(value)
  } else {
    formBolsista.value.dias.splice(index, 1)
  }
}

const toggleRestricao = (value: string) => {
  const index = formBolsista.value.restricoes_alimentares.indexOf(value)
  if (index === -1) {
    formBolsista.value.restricoes_alimentares.push(value)
  } else {
    formBolsista.value.restricoes_alimentares.splice(index, 1)
  }
}

onMounted(() => {
  carregarPerfil()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <PageHeader
      title="Meu Perfil"
      subtitle="Gerencie suas informações e segurança da conta."
      :show-back-button="true"
      :breadcrumbs="[{ label: 'Dashboard', route: '/dashboard' }, { label: 'Perfil' }]"
    />

    <!-- Foto de Perfil -->
    <Card>
      <template #title>Foto de Perfil</template>
      <template #content>
        <div class="flex items-center gap-6">
          <Avatar
            v-if="perfil?.foto"
            :image="perfil.foto"
            size="xlarge"
            shape="circle"
          />
          <Avatar
            v-else
            icon="pi pi-user"
            size="xlarge"
            shape="circle"
            :style="getAvatarStyle(perfil?.nome)"
          />
          <div class="flex-1 space-y-3">
            <div class="flex gap-2">
              <Button
                label="Escolher Foto"
                icon="pi pi-upload"
                severity="secondary"
                outlined
                @click="dispararUpload"
                :disabled="loading"
              />
              <input
                ref="fileInput"
                type="file"
                class="hidden"
                accept="image/jpeg,image/png,image/jpg,image/gif"
                @change="onFileChange"
              />
              <Button
                v-if="perfil?.foto"
                label="Remover"
                icon="pi pi-trash"
                severity="danger"
                text
                @click="removerFoto"
                :loading="loading"
              />
            </div>
            <p class="text-xs text-slate-500">JPG, PNG. Máximo 5MB.</p>
          </div>
        </div>
      </template>
    </Card>

    <!-- Dialog de Termos de Uso da Foto -->
    <Dialog
      v-model:visible="dialogTermos"
      modal
      header="Termos de Uso da Foto de Perfil"
      :style="{ width: '35rem' }"
    >
      <div class="space-y-4">
        <Message severity="info" :closable="false">
          Leia e aceite os termos antes de prosseguir
        </Message>

        <div class="space-y-3 text-sm text-slate-700">
          <p><strong>Ao enviar uma foto de perfil, você concorda que:</strong></p>
          <ul class="list-disc list-inside space-y-2 ml-4">
            <li>A foto será visível para administradores e operadores do sistema</li>
            <li>A foto será utilizada apenas para identificação no sistema do RI-IFBA</li>
            <li>A foto deve ser adequada e não conter conteúdo ofensivo</li>
            <li>Você possui os direitos sobre a imagem enviada</li>
            <li>A foto pode ser removida a qualquer momento por você ou pela administração</li>
          </ul>
          <p class="mt-4"><strong>Política de Privacidade:</strong></p>
          <ul class="list-disc list-inside space-y-2 ml-4">
            <li>Suas informações pessoais são protegidas conforme a LGPD</li>
            <li>A foto não será compartilhada com terceiros</li>
            <li>Você pode solicitar a exclusão de seus dados a qualquer momento</li>
          </ul>
        </div>

        <div class="flex items-start gap-2 p-3 bg-slate-50 rounded">
          <input
            id="aceite-termos"
            v-model="aceitouTermos"
            type="checkbox"
            class="mt-1"
          />
          <label for="aceite-termos" class="text-sm text-slate-700 cursor-pointer">
            Li e aceito os termos de uso e a política de privacidade
          </label>
        </div>
      </div>

      <template #footer>
        <Button label="Cancelar" text @click="dialogTermos = false" />
        <Button
          label="Confirmar e Enviar"
          :disabled="!aceitouTermos"
          :loading="loading"
          @click="uploadFoto"
        />
      </template>
    </Dialog>

    <!-- Informações Pessoais -->
    <Card>
      <template #title>Informações Pessoais</template>
      <template #subtitle>
        <p class="text-sm text-slate-500 mt-1">
          Estas informações são controladas pela administração. Para alterações, entre em contato com a secretaria.
        </p>
      </template>
      <template #content>
        <div v-if="loading" class="space-y-3">
          <Skeleton height="2.5rem" />
          <Skeleton height="2.5rem" />
          <Skeleton height="2.5rem" />
        </div>

        <div v-else class="grid gap-6 md:grid-cols-2">
          <!-- Nome Completo -->
          <div class="space-y-2">
            <label class="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 ml-1">
              <i class="pi pi-user text-primary-600"></i>
              Nome Completo
            </label>
            <div class="px-4 py-3 bg-slate-50/50 rounded-xl border border-slate-100">
              <p class="text-slate-900 font-bold">
                {{ perfil?.nome || '-' }}
              </p>
            </div>
          </div>

          <!-- Matrícula -->
          <div class="space-y-2">
            <label class="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 ml-1">
              <i class="pi pi-id-card text-primary-600"></i>
              Matrícula
            </label>
            <div class="px-4 py-3 bg-slate-50/50 rounded-xl border border-slate-100">
              <p class="text-slate-900 font-bold font-mono">
                {{ perfil?.matricula || '-' }}
              </p>
            </div>
          </div>

          <!-- E-mail -->
          <div class="space-y-2">
            <label class="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 ml-1">
              <i class="pi pi-envelope text-primary-600"></i>
              E-mail
            </label>
            <div class="px-4 py-3 bg-slate-50/50 rounded-xl border border-slate-100">
              <p class="text-slate-900 font-medium">
                {{ perfil?.email || '-' }}
              </p>
            </div>
          </div>

          <!-- Curso -->
          <div v-if="perfil?.perfil === 'estudante'" class="space-y-2">
            <label class="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 ml-1">
              <i class="pi pi-book text-primary-600"></i>
              Curso
            </label>
            <div class="px-4 py-3 bg-slate-50/50 rounded-xl border border-slate-100">
              <p class="text-slate-900 font-medium">
                {{ perfil?.curso || '-' }}
              </p>
            </div>
          </div>

          <!-- Turno -->
          <div v-if="perfil?.perfil === 'estudante'" class="space-y-2">
            <label class="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 ml-1">
              <i class="pi pi-clock text-primary-600"></i>
              {{ perfil?.bolsista ? 'Turno de Refeição' : 'Turno de Aula' }}
            </label>
            <div class="px-4 py-3 bg-slate-50/50 rounded-xl border border-slate-100">
              <p class="text-slate-900 font-medium flex items-center gap-2">
                <!-- Icone baseado no turno -->
                <i :class="{
                  'pi pi-sun text-amber-500': perfil?.turno_refeicao === 'almoco' || perfil?.turno_aula === 'matutino',
                  'pi pi-cloud text-blue-500': perfil?.turno_aula === 'vespertino',
                  'pi pi-moon text-indigo-500': perfil?.turno_refeicao === 'jantar' || perfil?.turno_aula === 'noturno'
                }"></i>
                <!-- Texto do turno -->
                <span class="capitalize">
                  {{ perfil?.bolsista ? (perfil?.turno_refeicao === 'almoco' ? 'Almoço' : 'Jantar') :
                     (perfil?.turno_aula === 'matutino' ? 'Matutino' :
                      perfil?.turno_aula === 'vespertino' ? 'Vespertino' :
                      perfil?.turno_aula === 'noturno' ? 'Noturno' : '-') }}
                </span>
              </p>
            </div>
          </div>

          <!-- Tipo de Acesso -->
          <div class="space-y-2">
            <label class="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 ml-1">
              <i class="pi pi-shield text-primary-600"></i>
              Tipo de Acesso
            </label>
            <div class="px-4 py-3 bg-slate-50/50 rounded-xl border border-slate-100">
              <Tag
                v-if="perfil?.perfil === 'admin'"
                value="Administrador"
                severity="danger"
                class="!rounded-full"
              />
              <Tag
                v-else
                :value="perfil?.bolsista ? 'Bolsista' : 'Não Bolsista'"
                :severity="perfil?.bolsista ? 'success' : 'info'"
                class="!rounded-full"
              />
            </div>
          </div>
        </div>
      </template>
    </Card>

    <!-- Seção exclusiva para Bolsistas -->
    <template v-if="perfil?.bolsista">
      <Accordion :value="['saude', 'frequencia']" multiple class="profile-accordions">
        <!-- Saúde e Restrições -->
        <AccordionPanel value="saude">
          <AccordionHeader>
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-lg bg-pink-100 flex items-center justify-center">
                <i class="pi pi-heart text-pink-600"></i>
              </div>
              <span class="font-bold text-slate-700">Saúde e Restrições Alimentares</span>
            </div>
          </AccordionHeader>
          <AccordionContent>
            <div class="space-y-6 pt-4">
              <!-- Alergias e Restrições - Lista de Checkboxes -->
              <div class="flex flex-col gap-3">
                <label class="font-bold text-slate-700">Alergias e Restrições Alimentares</label>
                <p class="text-sm text-slate-500">Selecione todas as alergias ou restrições que você possui:</p>
                <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div
                    v-for="opcao in alergiasOptions"
                    :key="opcao.value"
                    class="flex items-center gap-2 p-3 bg-white border border-slate-200 rounded-xl hover:border-primary-500 transition-colors cursor-pointer"
                    :class="{ 'bg-red-50 border-red-300': formBolsista.restricoes_alimentares.includes(opcao.value) }"
                    @click="toggleRestricao(opcao.value)"
                  >
                    <Checkbox
                      v-model="formBolsista.restricoes_alimentares"
                      :value="opcao.value"
                      :inputId="'alergia-' + opcao.value"
                    />
                    <label :for="'alergia-' + opcao.value" class="text-sm font-medium text-slate-700 cursor-pointer">
                      {{ opcao.label }}
                    </label>
                  </div>
                </div>
              </div>

              <!-- Outras alergias (texto livre) -->
              <div class="flex flex-col gap-3">
                <label class="font-bold text-slate-700">Outras Alergias</label>
                <Textarea
                  v-model="formBolsista.alergias"
                  rows="2"
                  autoResize
                  placeholder="Informe outras alergias que não estão na lista acima..."
                  class="w-full !rounded-xl"
                />
              </div>

              <div class="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div class="space-y-1">
                  <p class="font-bold text-slate-900">Ovolactovegetariano</p>
                  <p class="text-sm text-slate-500">Marque se você possui esta preferência alimentar.</p>
                </div>
                <ToggleSwitch v-model="formBolsista.is_ovolactovegetariano" />
              </div>

              <div class="flex justify-end pt-2">
                <Button
                  label="Salvar Informações de Saúde"
                  icon="pi pi-check"
                  severity="success"
                  @click="salvarDadosBolsista"
                  :loading="loadingBolsista"
                  class="!rounded-xl action-btn"
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionPanel>

        <!-- Frequência Semanal -->
        <AccordionPanel value="frequencia">
          <AccordionHeader>
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                <i class="pi pi-calendar text-amber-600"></i>
              </div>
              <span class="font-bold text-slate-700">Dias de Frequência</span>
              <Tag v-if="temSolicitacaoPendente" value="Pendente" severity="warn" class="!rounded-full !text-xs ml-2" />
            </div>
          </AccordionHeader>
          <AccordionContent>
            <div class="space-y-6 pt-4">
              <!-- Aviso de solicitação pendente -->
              <Message v-if="temSolicitacaoPendente" severity="warn" :closable="false" class="!rounded-xl">
                <div class="flex items-center gap-2">
                  <i class="pi pi-clock"></i>
                  <span>Você possui uma solicitação de mudança pendente. Aguarde a análise do administrador.</span>
                </div>
              </Message>

              <p class="text-sm text-slate-500">
                Selecione os dias que você frequenta o refeitório. Alterações dependem de aprovação do administrador.
              </p>
              <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div v-for="dia in diasSemanaOpcoes" :key="dia.value"
                     class="flex items-center gap-2 p-3 bg-white border border-slate-200 rounded-xl hover:border-primary-500 transition-colors cursor-pointer"
                     :class="{ 'opacity-50': temSolicitacaoPendente }"
                     @click="!temSolicitacaoPendente && toggleDia(dia.value)">
                  <Checkbox v-model="formBolsista.dias" :value="dia.value" :disabled="temSolicitacaoPendente" />
                  <label class="font-bold text-slate-700 cursor-pointer">{{ dia.label }}</label>
                </div>
              </div>

              <div class="flex justify-end pt-2">
                <Button
                  label="Solicitar Mudança de Dias"
                  icon="pi pi-send"
                  severity="success"
                  @click="abrirModalMudanca"
                  :disabled="temSolicitacaoPendente"
                  class="!rounded-xl action-btn"
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionPanel>
      </Accordion>
    </template>

    <!-- Modal de Motivo da Mudança -->
    <Dialog
      v-model:visible="displayMotivoMudanca"
      modal
      header="Solicitar Mudança de Dias"
      :style="{ width: '450px' }"
      class="!rounded-xl"
    >
      <div class="space-y-4 pt-2">
        <div class="p-4 bg-blue-50 rounded-xl border border-blue-100">
          <p class="text-sm text-blue-700">
            <i class="pi pi-info-circle mr-2"></i>
            Informe o motivo da sua solicitação para que o administrador possa analisá-la.
          </p>
        </div>

        <div class="space-y-2">
          <label class="font-bold text-slate-700">Dias Selecionados</label>
          <div class="flex flex-wrap gap-2">
            <Tag
              v-for="dia in formBolsista.dias.sort()"
              :key="dia"
              :value="diasSemanaOpcoes.find(d => d.value === dia)?.label"
              severity="success"
              class="!rounded-full"
            />
          </div>
        </div>

        <div class="space-y-2">
          <label class="font-bold text-slate-700">Motivo da Solicitação *</label>
          <Textarea
            v-model="motivoMudanca"
            rows="4"
            autoResize
            placeholder="Ex: Mudança de horário de aula, estágio, etc..."
            class="w-full !rounded-xl"
          />
        </div>
      </div>

      <template #footer>
        <div class="flex gap-3 w-full">
          <Button
            label="Cancelar"
            icon="pi pi-times"
            text
            @click="displayMotivoMudanca = false"
            class="flex-1 !rounded-xl"
          />
          <Button
            label="Enviar Solicitação"
            icon="pi pi-send"
            severity="success"
            @click="solicitarMudancaDias"
            :loading="loadingBolsista"
            class="flex-1 !rounded-xl"
          />
        </div>
      </template>
    </Dialog>

    <!-- Alterar Senha -->
    <Accordion class="profile-accordions">
      <AccordionPanel value="senha">
        <AccordionHeader>
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <i class="pi pi-lock text-blue-600"></i>
            </div>
            <span class="font-bold text-slate-700">Segurança e Senha</span>
          </div>
        </AccordionHeader>
        <AccordionContent>
          <form @submit.prevent="alterarSenha" class="space-y-6 pt-4">
            <div class="space-y-1">
              <label class="text-sm font-bold text-slate-600 ml-1">Senha Atual</label>
              <Password
                v-model="formSenha.senha_atual"
                :feedback="false"
                toggleMask
                class="w-full"
                inputClass="w-full !rounded-xl border-slate-200 focus:border-primary-500"
                required
                placeholder="Digite sua senha atual"
              />
            </div>

            <div class="grid gap-4 md:grid-cols-2">
              <div class="space-y-1">
                <label class="text-sm font-bold text-slate-600 ml-1">Nova Senha</label>
                <Password
                  v-model="formSenha.senha_nova"
                  toggleMask
                  class="w-full"
                  inputClass="w-full !rounded-xl border-slate-200 focus:border-primary-500"
                  required
                  placeholder="Mínimo 6 caracteres"
                />
              </div>

              <div class="space-y-1">
                <label class="text-sm font-bold text-slate-600 ml-1">Confirmar Nova Senha</label>
                <Password
                  v-model="formSenha.senha_nova_confirmacao"
                  :feedback="false"
                  toggleMask
                  class="w-full"
                  inputClass="w-full !rounded-xl border-slate-200 focus:border-primary-500"
                  required
                  placeholder="Repita a nova senha"
                />
              </div>
            </div>

            <div class="flex justify-end pt-2">
              <Button
                type="submit"
                label="Atualizar Senha"
                icon="pi pi-check"
                severity="info"
                :loading="loadingSenha"
                class="!rounded-xl action-btn"
              />
            </div>
          </form>
        </AccordionContent>
      </AccordionPanel>
    </Accordion>
  </div>
</template>

<style scoped>
/* Estilos para os Accordions do perfil */
.profile-accordions :deep(.p-accordionpanel) {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 1rem;
  overflow: hidden;
  margin-bottom: 1rem;
}

.profile-accordions :deep(.p-accordionheader) {
  background: white;
  padding: 1rem 1.25rem;
  border: none;
}

.profile-accordions :deep(.p-accordionheader:hover) {
  background: #f8fafc;
}

.profile-accordions :deep(.p-accordioncontent-content) {
  padding: 0 1.25rem 1.25rem;
  border-top: 1px solid #f1f5f9;
}

/* Estilo padronizado para botões de ação */
.action-btn {
  padding: 0.75rem 1.5rem !important;
  font-weight: 600 !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important;
}

.action-btn:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
  transform: translateY(-1px);
}
</style>

