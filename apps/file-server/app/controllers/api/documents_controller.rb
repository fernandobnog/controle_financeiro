module Api
  class DocumentsController < ApplicationController
    MAX_FILE_SIZE_BYTES = 15.megabytes
    ALLOWED_MIME_TYPES = %w[application/pdf image/jpeg image/png image/webp].freeze

    def create
      uploaded_file = params[:file]
      household_id = document_params[:household_id].to_s.strip

      if household_id.blank?
        return render json: { message: "Informe o householdId do documento." }, status: :unprocessable_entity
      end

      unless uploaded_file.respond_to?(:content_type) && uploaded_file.respond_to?(:size)
        return render json: { message: "Arquivo nao enviado corretamente." }, status: :unprocessable_entity
      end

      unless ALLOWED_MIME_TYPES.include?(uploaded_file.content_type)
        return render json: { message: "Tipo de arquivo nao permitido." }, status: :unprocessable_entity
      end

      if uploaded_file.size.to_i <= 0 || uploaded_file.size.to_i > MAX_FILE_SIZE_BYTES
        return render json: { message: "Tamanho de arquivo invalido para o ambiente padrao." }, status: :unprocessable_entity
      end

      stored_document = StoredDocument.new(
        account_id: auth_context.account_id,
        household_id: household_id,
        uploaded_by_user_id: auth_context.user_id,
        original_filename: uploaded_file.original_filename,
        content_type: uploaded_file.content_type,
        byte_size: uploaded_file.size,
        status: "received"
      )
      stored_document.file.attach(uploaded_file)
      stored_document.save!

      render json: serialize_document(stored_document), status: :created
    rescue ActiveRecord::RecordInvalid => error
      render json: { message: error.record.errors.full_messages.to_sentence }, status: :unprocessable_entity
    end

    def show
      stored_document = StoredDocument.find(params[:id])
      raise AuthorizationError, "Conta sem acesso ao documento solicitado." if stored_document.account_id != auth_context.account_id

      render json: serialize_document(stored_document)
    rescue ActiveRecord::RecordNotFound
      render json: { message: "Documento nao encontrado." }, status: :not_found
    end

    private

    def document_params
      params.permit(:household_id)
    end

    def serialize_document(stored_document)
      {
        id: stored_document.id.to_s,
        filename: stored_document.original_filename,
        mimeType: stored_document.content_type,
        sizeInBytes: stored_document.byte_size,
        signedDownloadUrl: signed_download_url_for(stored_document)
      }
    end

    def signed_download_url_for(stored_document)
      return nil unless stored_document.file.attached?

      "#{request.base_url}#{rails_blob_path(stored_document.file, disposition: 'attachment', only_path: true)}"
    end
  end
end