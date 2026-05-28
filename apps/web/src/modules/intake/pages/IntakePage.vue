<template>
  <section class="page-panel">
    <header class="page-panel__header">
      <div>
        <h2>Ingestao e revisao de OCR</h2>
        <p class="panel-note">Upload manual, leitura assistida e revisao humana antes da consolidacao financeira.</p>
      </div>
      <Tag :value="currentStatusLabel" :severity="currentStatusSeverity" />
    </header>

    <div class="review-toolbar">
      <FileUpload
        mode="basic"
        chooseLabel="Selecionar documento"
        customUpload
        auto
        :disabled="uploading"
        accept=".pdf,image/*"
        @uploader="handleUpload"
      />
      <span class="panel-note">{{ uploadFeedback }}</span>
    </div>

    <div v-if="loading" class="page-panel">
      <ProgressSpinner strokeWidth="4" />
      <p class="panel-note">Carregando documentos em revisao...</p>
    </div>

    <div v-else-if="errorMessage" class="panel-error">{{ errorMessage }}</div>

    <div v-else class="review-grid">
      <aside class="review-sidebar">
        <Button
          v-for="document in documents"
          :key="document.id"
          class="review-sidebar__item"
          severity="secondary"
          :outlined="selectedDocumentId !== document.id"
          :label="document.filename"
          @click="selectDocument(document.id)"
        />
      </aside>

      <Card>
        <template #title>Linhas do OCR em revisao</template>
        <template #subtitle>
          <a v-if="reviewDocument?.signedDownloadUrl" :href="reviewDocument.signedDownloadUrl" target="_blank" rel="noreferrer">
            Abrir arquivo original
          </a>
        </template>
        <template #content>
          <DataTable
            v-if="reviewDocument"
            :value="reviewDocument.ocrEntries"
            editMode="cell"
            dataKey="id"
            responsiveLayout="scroll"
            @cell-edit-complete="onCellEditComplete"
          >
            <Column field="description" header="Descricao">
              <template #editor="slotProps">
                <InputText v-model="slotProps.data[slotProps.field]" />
              </template>
            </Column>
            <Column field="amount" header="Valor">
              <template #body="slotProps">{{ formatCurrency(slotProps.data.amount) }}</template>
              <template #editor="slotProps">
                <InputNumber v-model="slotProps.data[slotProps.field]" mode="currency" currency="BRL" locale="pt-BR" />
              </template>
            </Column>
            <Column field="occurredAt" header="Data">
              <template #editor="slotProps">
                <InputText v-model="slotProps.data[slotProps.field]" />
              </template>
            </Column>
            <Column field="category" header="Categoria">
              <template #editor="slotProps">
                <InputText v-model="slotProps.data[slotProps.field]" />
              </template>
            </Column>
            <Column field="reviewed" header="Revisado">
              <template #body="slotProps">
                <Tag :value="slotProps.data.reviewed ? 'sim' : 'nao'" :severity="slotProps.data.reviewed ? 'success' : 'warning'" />
              </template>
            </Column>
          </DataTable>
          <p v-else class="panel-note">Selecione um documento para revisar as linhas extraidas.</p>
        </template>
      </Card>
    </div>
  </section>
</template>

<script lang="ts">
import type { DocumentListItem, DocumentReview, UpdateOcrEntryInput } from '@controle-financeiro/shared-contracts';
import { defineComponent } from 'vue';
import Button from 'primevue/button';
import Card from 'primevue/card';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import FileUpload from 'primevue/fileupload';
import InputNumber from 'primevue/inputnumber';
import InputText from 'primevue/inputtext';
import ProgressSpinner from 'primevue/progressspinner';
import Tag from 'primevue/tag';

import {
  getDocumentReview,
  getDocuments,
  getOnboardingProfile,
  registerDocument,
  updateDocumentOcrEntry,
  uploadFileToStorage
} from '@/shared/api/client';

interface UploadEvent {
  files: File | File[];
}

interface CellEditEvent {
  data: {
    id: string;
    [key: string]: unknown;
  };
  field: string;
  newValue: unknown;
  value: unknown;
}

export default defineComponent({
  name: 'IntakePage',
  components: {
    Button,
    Card,
    Column,
    DataTable,
    FileUpload,
    InputNumber,
    InputText,
    ProgressSpinner,
    Tag
  },
  data() {
    return {
      documents: [] as DocumentListItem[],
      reviewDocument: null as DocumentReview | null,
      selectedDocumentId: '',
      householdId: '',
      loading: true,
      uploading: false,
      errorMessage: '',
      uploadFeedback: 'Selecione um PDF ou imagem para enviar ao file server.'
    };
  },
  computed: {
    currentStatusLabel(): string {
      return this.reviewDocument?.status ?? 'sem-documento';
    },
    currentStatusSeverity(): 'info' | 'warning' | 'success' | 'danger' | 'secondary' {
      switch (this.reviewDocument?.status) {
        case 'approved':
          return 'success';
        case 'rejected':
          return 'danger';
        case 'review':
          return 'warning';
        case 'processing':
          return 'info';
        default:
          return 'secondary';
      }
    }
  },
  async created() {
    await Promise.all([this.loadHouseholdContext(), this.loadDocuments()]);
  },
  methods: {
    async loadHouseholdContext() {
      const profile = await getOnboardingProfile();

      this.householdId = profile.householdId;
    },
    async loadDocuments(preferredDocumentId?: string) {
      this.loading = true;
      this.errorMessage = '';

      try {
        this.documents = await getDocuments();
        const preferredDocument = preferredDocumentId
          ? this.documents.find((document) => document.id === preferredDocumentId)
          : this.documents[0];

        if (preferredDocument) {
          await this.selectDocument(preferredDocument.id);
        } else {
          this.selectedDocumentId = '';
          this.reviewDocument = null;
        }
      } catch (error) {
        this.errorMessage = error instanceof Error ? error.message : 'Falha ao carregar documentos.';
      } finally {
        this.loading = false;
      }
    },
    async selectDocument(documentId: string) {
      this.selectedDocumentId = documentId;
      this.reviewDocument = await getDocumentReview(documentId);
    },
    buildOcrEntryPayload(field: string, value: unknown): UpdateOcrEntryInput {
      const payload: UpdateOcrEntryInput = {
        reviewed: true
      };

      if (field === 'description') {
        payload.description = String(value ?? '').trim();
      }

      if (field === 'amount') {
        payload.amount = typeof value === 'number' ? value : Number(value ?? 0);
      }

      if (field === 'occurredAt') {
        payload.occurredAt = String(value ?? '').trim();
      }

      if (field === 'category') {
        payload.category = String(value ?? '').trim();
      }

      return payload;
    },
    async onCellEditComplete(event: CellEditEvent) {
      if (!this.reviewDocument) {
        return;
      }

      const previousValue = event.value;
      event.data[event.field] = event.newValue;

      try {
        const updatedDocument = await updateDocumentOcrEntry(
          this.reviewDocument.id,
          event.data.id,
          this.buildOcrEntryPayload(event.field, event.newValue)
        );

        this.reviewDocument = updatedDocument;
      } catch (error) {
        event.data[event.field] = previousValue;
        this.errorMessage = error instanceof Error ? error.message : 'Falha ao salvar a revisao do OCR.';
      }
    },
    async handleUpload(event: UploadEvent) {
      const firstFile = Array.isArray(event.files) ? event.files[0] : event.files;

      if (!(firstFile instanceof File)) {
        this.errorMessage = 'Selecione um arquivo valido para upload.';
        return;
      }

      if (!this.householdId) {
        this.errorMessage = 'Conclua ou recarregue a base financeira antes de enviar documentos.';
        return;
      }

      this.uploading = true;
      this.errorMessage = '';
      this.uploadFeedback = `Enviando ${firstFile.name} para o file server...`;

      try {
        const storedFile = await uploadFileToStorage(this.householdId, firstFile);
        const document = await registerDocument({
          householdId: this.householdId,
          fileServerDocumentId: storedFile.id,
          filename: storedFile.filename,
          mimeType: storedFile.mimeType,
          sizeInBytes: storedFile.sizeInBytes,
          signedDownloadUrl: storedFile.signedDownloadUrl
        });

        this.uploadFeedback = `${document.filename} enviado e registrado para revisao.`;
        await this.loadDocuments(document.id);
      } catch (error) {
        this.errorMessage = error instanceof Error ? error.message : 'Falha ao enviar o documento.';
        this.uploadFeedback = 'Selecione um PDF ou imagem para enviar ao file server.';
      } finally {
        this.uploading = false;
      }
    },
    formatCurrency(value: number) {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(value);
    }
  }
});
</script>