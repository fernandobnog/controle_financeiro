ENV['RAILS_ENV'] ||= 'test'

require_relative '../config/environment'
require 'rails/test_help'

module AuthTokenTestHelper
  def build_access_token(overrides = {})
    payload = {
      sub: 'user-1',
      accountId: 'account-1',
      email: 'owner@familia-souza.local',
      fullName: 'Responsavel Familia Souza',
      role: 'owner',
      exp: 10.years.from_now.to_i
    }.merge(overrides)
    encoded_payload = Base64.urlsafe_encode64(payload.to_json, padding: false)
    signature = Base64.urlsafe_encode64(
      OpenSSL::HMAC.digest('sha256', ENV.fetch('APP_AUTH_SECRET', 'controle-financeiro-dev-secret'), encoded_payload),
      padding: false
    )

    "#{encoded_payload}.#{signature}"
  end
end

class ActiveSupport::TestCase
  parallelize(workers: 1)
end

class ActionDispatch::IntegrationTest
  include AuthTokenTestHelper
end