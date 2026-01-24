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
import FileUpload from 'primevue/fileupload'
import Dialog from 'primevue/dialog'
import Message from 'primevue/message'
import Skeleton from 'primevue/skeleton'
import Tag from 'primevue/tag'
import type { Perfil } from '../../types/perfil'

const auth = useAuthStore()
const toast = useToast()
const { getInitials, getAvatarStyle } = useAvatar()

const perfil = ref<Perfil | null>(null)
const loading = ref(false)
const loadingSenha = ref(false)

const formSenha = ref({
  senha_atual: '',
  senha_nova: '',
  senha_nova_confirmacao: ''
})

const carregarPerfil = async () => {
  loading.value = true
  try {
    perfil.value = await perfilService.obter()
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
      senha_atual: formSenha.value.senha_atual,
      senha_nova: formSenha.value.senha_nova,
      senha_nova_confirmacao: formSenha.value.senha_nova_confirmacao
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

  // Validar tamanho (2MB)
  const maxSize = 2 * 1024 * 1024 // 2MB
  if (file.size > maxSize) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(2)
    toast.add({
      severity: 'error',
      summary: 'Arquivo muito grande',
      detail: `Arquivo tem ${sizeMB} MB. Tamanho máximo: 2 MB`,
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
            <p class="text-xs text-slate-500">JPG, PNG. Máximo 2MB.</p>
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
            <div class="px-4 py-3 bg-slate-50/50 rounded-2xl border border-slate-100">
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
            <div class="px-4 py-3 bg-slate-50/50 rounded-2xl border border-slate-100">
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
            <div class="px-4 py-3 bg-slate-50/50 rounded-2xl border border-slate-100">
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
            <div class="px-4 py-3 bg-slate-50/50 rounded-2xl border border-slate-100">
              <p class="text-slate-900 font-medium">
                {{ perfil?.curso || '-' }}
              </p>
            </div>
          </div>

          <!-- Turno -->
          <div v-if="perfil?.perfil === 'estudante'" class="space-y-2">
            <label class="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 ml-1">
              <i class="pi pi-clock text-primary-600"></i>
              {{ perfil?.bolsista ? 'Refeicao' : 'Turno de Aula' }}
            </label>
            <div class="px-4 py-3 bg-slate-50/50 rounded-2xl border border-slate-100">
              <p class="text-slate-900 font-medium flex items-center gap-2">
                <!-- Icone baseado no turno -->
                <i :class="{
                  'pi pi-sun text-amber-500': perfil?.turno_refeicao === 'almoco' || perfil?.turno_aula === 'matutino',
                  'pi pi-cloud text-blue-500': perfil?.turno_aula === 'vespertino',
                  'pi pi-moon text-indigo-500': perfil?.turno_refeicao === 'jantar' || perfil?.turno_aula === 'noturno'
                }"></i>
                <!-- Texto do turno -->
                <span class="capitalize">
                  {{ perfil?.bolsista ? (perfil?.turno_refeicao === 'almoco' ? 'Almoco' : 'Jantar') :
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
            <div class="px-4 py-3 bg-slate-50/50 rounded-2xl border border-slate-100">
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

    <!-- Alterar Senha -->
    <Card>
      <template #title>Alterar Senha</template>
      <template #content>
        <form @submit.prevent="alterarSenha" class="space-y-4">
          <div class="grid gap-4 md:grid-cols-2">
            <div class="space-y-1">
              <label class="text-sm font-medium text-slate-700">Senha Atual</label>
              <Password
                v-model="formSenha.senha_atual"
                :feedback="false"
                toggleMask
                class="w-full"
                inputClass="w-full"
                required
              />
            </div>

            <div class="md:col-span-2"></div>

            <div class="space-y-1">
              <label class="text-sm font-medium text-slate-700">Nova Senha</label>
              <Password
                v-model="formSenha.senha_nova"
                toggleMask
                class="w-full"
                inputClass="w-full"
                required
              />
            </div>

            <div class="space-y-1">
              <label class="text-sm font-medium text-slate-700">Confirmar Nova Senha</label>
              <Password
                v-model="formSenha.senha_nova_confirmacao"
                :feedback="false"
                toggleMask
                class="w-full"
                inputClass="w-full"
                required
              />
            </div>
          </div>

          <div class="flex justify-end">
            <Button
              type="submit"
              label="Alterar Senha"
              severity="secondary"
              :loading="loadingSenha"
            />
          </div>
        </form>
      </template>
    </Card>
  </div>
</template>
