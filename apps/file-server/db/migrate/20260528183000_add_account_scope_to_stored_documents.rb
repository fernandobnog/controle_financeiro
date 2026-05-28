class AddAccountScopeToStoredDocuments < ActiveRecord::Migration[8.0]
  def change
    add_column :stored_documents, :account_id, :string
    add_column :stored_documents, :uploaded_by_user_id, :string

    reversible do |direction|
      direction.up do
        execute <<~SQL
          UPDATE stored_documents
          SET account_id = 'account-1'
          WHERE account_id IS NULL
        SQL
      end
    end

    change_column_null :stored_documents, :account_id, false
    add_index :stored_documents, :account_id
    add_index :stored_documents, %i[account_id household_id]
  end
end