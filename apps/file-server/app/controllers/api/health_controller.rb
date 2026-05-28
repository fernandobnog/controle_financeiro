module Api
  class HealthController < ApplicationController
    def show
      render json: {
        status: "ok",
        service: "file-server",
        timestamp: Time.current.iso8601
      }
    end
  end
end