require "base64"
require "json"
require "openssl"

class ApplicationController < ActionController::API
	class AuthenticationError < StandardError; end
	class AuthorizationError < StandardError; end

	AuthContext = Struct.new(:user_id, :account_id, :email, :full_name, :role, keyword_init: true)

	before_action :authenticate_request!

	rescue_from AuthenticationError do
		render json: { message: "Sessao nao autenticada." }, status: :unauthorized
	end

	rescue_from AuthorizationError do |error|
		render json: { message: error.message.presence || "Conta sem acesso ao recurso solicitado." }, status: :forbidden
	end

	private

	attr_reader :auth_context

	def public_endpoint?
		false
	end

	def authenticate_request!
		return if public_endpoint?

		token = bearer_token
		raise AuthenticationError if token.blank?

		@auth_context = verify_access_token(token)
		raise AuthenticationError if auth_context.nil?
	end

	def bearer_token
		scheme, token = request.headers["Authorization"].to_s.split(" ", 2)

		return nil unless scheme == "Bearer"

		token
	end

	def verify_access_token(token)
		encoded_payload, received_signature = token.to_s.split(".", 2)
		return nil if encoded_payload.blank? || received_signature.blank?

		expected_signature = Base64.urlsafe_encode64(
			OpenSSL::HMAC.digest("sha256", auth_secret, encoded_payload),
			padding: false
		)

		return nil unless secure_compare(expected_signature, received_signature)

		payload = JSON.parse(Base64.urlsafe_decode64(pad_base64(encoded_payload)))
		return nil if payload["exp"].to_i <= Time.current.to_i

		AuthContext.new(
			user_id: payload["sub"],
			account_id: payload["accountId"],
			email: payload["email"],
			full_name: payload["fullName"],
			role: payload["role"]
		)
	rescue JSON::ParserError, ArgumentError
		nil
	end

	def secure_compare(left, right)
		return false if left.blank? || right.blank? || left.bytesize != right.bytesize

		ActiveSupport::SecurityUtils.secure_compare(left, right)
	end

	def pad_base64(value)
		value + ("=" * ((4 - value.length % 4) % 4))
	end

	def auth_secret
		ENV["APP_AUTH_SECRET"].presence || (Rails.env.production? ? raise("APP_AUTH_SECRET deve ser configurado em producao.") : "controle-financeiro-dev-secret")
	end
end
