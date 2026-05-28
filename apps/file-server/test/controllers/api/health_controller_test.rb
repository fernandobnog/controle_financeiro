require 'test_helper'

class Api::HealthControllerTest < ActionDispatch::IntegrationTest
  test 'show returns the public service status payload' do
    get '/api/health'

    assert_response :success
    assert_equal %w[service status timestamp].sort, response.parsed_body.keys.sort
    assert_equal 'ok', response.parsed_body['status']
    assert_equal 'file-server', response.parsed_body['service']
    assert_not_nil response.parsed_body['timestamp']
  end
end