class CreateStoredDocuments < ActiveRecord::Migration[8.0]
  def change
    create_table :stored_documents do |t|
      t.string :household_id, null: false
      t.string :original_filename, null: false
      t.string :content_type, null: false
      t.integer :byte_size, null: false
      t.string :status, null: false, default: "received"

      t.timestamps
    end

    add_index :stored_documents, :household_id
  end
end
