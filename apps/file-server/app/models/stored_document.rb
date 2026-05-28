class StoredDocument < ApplicationRecord
	has_one_attached :file

	validates :account_id, presence: true
	validates :household_id, presence: true
	validates :uploaded_by_user_id, presence: true
	validates :original_filename, presence: true
	validates :content_type, presence: true
	validates :byte_size, numericality: { greater_than: 0 }
	validates :status, presence: true
end
