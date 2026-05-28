require 'tempfile'
require 'test_helper'

class Api::DocumentsControllerTest < ActionDispatch::IntegrationTest
  test 'create requires authentication' do
    post '/api/documents', params: {
      household_id: 'household-1'
    }

    assert_response :unauthorized
    assert_equal 'Sessao nao autenticada.', response.parsed_body['message']
  end

  test 'create requires a household id' do
    post '/api/documents', params: {
      household_id: '  ',
      file: fixture_file_upload('sample.pdf', 'application/pdf')
    }, headers: auth_headers

    assert_response :unprocessable_entity
    assert_equal 'Informe o householdId do documento.', response.parsed_body['message']
  end

  test 'create requires a valid uploaded file' do
    post '/api/documents', params: {
      household_id: 'household-1'
    }, headers: auth_headers

    assert_response :unprocessable_entity
    assert_equal 'Arquivo nao enviado corretamente.', response.parsed_body['message']
  end

  test 'create rejects unsupported mime types' do
    post '/api/documents', params: {
      household_id: 'household-1',
      file: fixture_file_upload('sample.pdf', 'text/plain')
    }, headers: auth_headers

    assert_response :unprocessable_entity
    assert_equal 'Tipo de arquivo nao permitido.', response.parsed_body['message']
  end

  test 'create rejects files with an invalid size' do
    invalid_size_file = build_uploaded_file(
      filename: 'extrato-vazio.pdf',
      content_type: 'application/pdf',
      contents: ''
    )

    post '/api/documents', params: {
      household_id: 'household-1',
      file: invalid_size_file
    }, headers: auth_headers

    assert_response :unprocessable_entity
    assert_equal 'Tamanho de arquivo invalido para o ambiente padrao.', response.parsed_body['message']
  ensure
    invalid_size_file&.tempfile&.close!
  end

  test 'create returns minimal payload and stores account scope' do
    post '/api/documents', params: {
      household_id: 'household-1',
      file: fixture_file_upload('sample.pdf', 'application/pdf')
    }, headers: {
      'Authorization' => "Bearer #{build_access_token}"
    }

    assert_response :created
    assert_equal %w[filename id mimeType signedDownloadUrl sizeInBytes].sort, response.parsed_body.keys.sort

    stored_document = StoredDocument.order(:created_at).last

    assert_equal 'account-1', stored_document.account_id
    assert_equal 'user-1', stored_document.uploaded_by_user_id
  end

  test 'show returns the minimal download payload for the owning account' do
    stored_document = create_stored_document

    get "/api/documents/#{stored_document.id}", headers: auth_headers

    assert_response :success
    assert_equal %w[filename id mimeType signedDownloadUrl sizeInBytes].sort, response.parsed_body.keys.sort
    assert_equal 'extrato.pdf', response.parsed_body['filename']
    assert_equal 'application/pdf', response.parsed_body['mimeType']
  end

  test 'show returns not found for an unknown document id' do
    get '/api/documents/documento-inexistente', headers: auth_headers

    assert_response :not_found
    assert_equal 'Documento nao encontrado.', response.parsed_body['message']
  end

  test 'show rejects access from another account' do
    stored_document = create_stored_document

    get "/api/documents/#{stored_document.id}", headers: {
      'Authorization' => "Bearer #{build_access_token(sub: 'user-2', accountId: 'account-2', email: 'owner@familia-lima.local', fullName: 'Responsavel Familia Lima')}"
    }

    assert_response :forbidden
    assert_equal 'Conta sem acesso ao documento solicitado.', response.parsed_body['message']
  end

  private

  def auth_headers(overrides = {})
    {
      'Authorization' => "Bearer #{build_access_token(overrides)}"
    }
  end

  def build_uploaded_file(filename:, content_type:, contents:)
    tempfile = Tempfile.new([File.basename(filename, '.*'), File.extname(filename)])
    tempfile.binmode
    tempfile.write(contents)
    tempfile.rewind

    Rack::Test::UploadedFile.new(
      tempfile.path,
      content_type,
      true,
      original_filename: filename
    )
  end

  def create_stored_document
    stored_document = StoredDocument.create!(
      account_id: 'account-1',
      household_id: 'household-1',
      uploaded_by_user_id: 'user-1',
      original_filename: 'extrato.pdf',
      content_type: 'application/pdf',
      byte_size: 15,
      status: 'received'
    )
    stored_document.file.attach(
      io: StringIO.new('fake pdf'),
      filename: 'extrato.pdf',
      content_type: 'application/pdf'
    )

    stored_document
  end
end