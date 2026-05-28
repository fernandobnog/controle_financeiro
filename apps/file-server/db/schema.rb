# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.0].define(version: 2026_05_28_183000) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"

  create_table "active_storage_attachments", force: :cascade do |t|
    t.string "name", null: false
    t.string "record_type", null: false
    t.bigint "record_id", null: false
    t.bigint "blob_id", null: false
    t.datetime "created_at", null: false
    t.index ["blob_id"], name: "index_active_storage_attachments_on_blob_id"
    t.index ["record_type", "record_id", "name", "blob_id"], name: "index_active_storage_attachments_uniqueness", unique: true
  end

  create_table "active_storage_blobs", force: :cascade do |t|
    t.string "key", null: false
    t.string "filename", null: false
    t.string "content_type"
    t.text "metadata"
    t.string "service_name", null: false
    t.bigint "byte_size", null: false
    t.string "checksum"
    t.datetime "created_at", null: false
    t.index ["key"], name: "index_active_storage_blobs_on_key", unique: true
  end

  create_table "active_storage_variant_records", force: :cascade do |t|
    t.bigint "blob_id", null: false
    t.string "variation_digest", null: false
    t.index ["blob_id", "variation_digest"], name: "index_active_storage_variant_records_uniqueness", unique: true
  end

  create_table "api_schema_migrations", primary_key: "name", id: :text, force: :cascade do |t|
    t.timestamptz "executed_at", default: -> { "CURRENT_TIMESTAMP" }, null: false
  end

  create_table "budget_envelopes", id: :text, force: :cascade do |t|
    t.text "household_id", null: false
    t.text "category", null: false
    t.decimal "planned_amount", precision: 12, scale: 2, null: false
    t.decimal "actual_amount", precision: 12, scale: 2
    t.timestamptz "created_at", default: -> { "CURRENT_TIMESTAMP" }, null: false
    t.timestamptz "updated_at", default: -> { "CURRENT_TIMESTAMP" }, null: false
    t.index ["household_id"], name: "idx_budget_envelopes_household_id"
  end

  create_table "debts", id: :text, force: :cascade do |t|
    t.text "household_id", null: false
    t.text "creditor", null: false
    t.decimal "balance", precision: 12, scale: 2, null: false
    t.decimal "monthly_payment", precision: 12, scale: 2, null: false
    t.decimal "interest_rate", precision: 8, scale: 4, null: false
    t.integer "overdue_months", default: 0, null: false
    t.timestamptz "created_at", default: -> { "CURRENT_TIMESTAMP" }, null: false
    t.timestamptz "updated_at", default: -> { "CURRENT_TIMESTAMP" }, null: false
    t.index ["household_id"], name: "idx_debts_household_id"
  end

  create_table "documents", id: :text, force: :cascade do |t|
    t.text "household_id", null: false
    t.text "file_server_document_id", null: false
    t.text "filename", null: false
    t.text "mime_type", null: false
    t.integer "size_in_bytes", null: false
    t.text "status", null: false
    t.text "signed_download_url"
    t.timestamptz "created_at", default: -> { "CURRENT_TIMESTAMP" }, null: false
    t.timestamptz "updated_at", default: -> { "CURRENT_TIMESTAMP" }, null: false
    t.index ["household_id"], name: "idx_documents_household_id"
    t.index ["status"], name: "idx_documents_status"
    t.unique_constraint ["file_server_document_id"], name: "documents_file_server_document_id_key"
  end

  create_table "households", id: :text, force: :cascade do |t|
    t.text "name", null: false
    t.timestamptz "created_at", default: -> { "CURRENT_TIMESTAMP" }, null: false
    t.timestamptz "updated_at", default: -> { "CURRENT_TIMESTAMP" }, null: false
  end

  create_table "incomes", id: :text, force: :cascade do |t|
    t.text "household_id", null: false
    t.text "label", null: false
    t.decimal "amount", precision: 12, scale: 2, null: false
    t.boolean "recurring", default: true, null: false
    t.timestamptz "created_at", default: -> { "CURRENT_TIMESTAMP" }, null: false
    t.timestamptz "updated_at", default: -> { "CURRENT_TIMESTAMP" }, null: false
    t.index ["household_id"], name: "idx_incomes_household_id"
  end

  create_table "ocr_entries", id: :text, force: :cascade do |t|
    t.text "document_id", null: false
    t.text "description", null: false
    t.decimal "amount", precision: 12, scale: 2, null: false
    t.date "occurred_at", null: false
    t.text "category", null: false
    t.boolean "reviewed", default: false, null: false
    t.timestamptz "created_at", default: -> { "CURRENT_TIMESTAMP" }, null: false
    t.timestamptz "updated_at", default: -> { "CURRENT_TIMESTAMP" }, null: false
    t.index ["document_id"], name: "idx_ocr_entries_document_id"
  end

  create_table "stored_documents", force: :cascade do |t|
    t.string "household_id", null: false
    t.string "original_filename", null: false
    t.string "content_type", null: false
    t.integer "byte_size", null: false
    t.string "status", default: "received", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "account_id", null: false
    t.string "uploaded_by_user_id"
    t.index ["account_id", "household_id"], name: "index_stored_documents_on_account_id_and_household_id"
    t.index ["account_id"], name: "index_stored_documents_on_account_id"
    t.index ["household_id"], name: "index_stored_documents_on_household_id"
  end

  add_foreign_key "active_storage_attachments", "active_storage_blobs", column: "blob_id"
  add_foreign_key "active_storage_variant_records", "active_storage_blobs", column: "blob_id"
  add_foreign_key "budget_envelopes", "households", name: "budget_envelopes_household_id_fkey", on_delete: :cascade
  add_foreign_key "debts", "households", name: "debts_household_id_fkey", on_delete: :cascade
  add_foreign_key "documents", "households", name: "documents_household_id_fkey", on_delete: :cascade
  add_foreign_key "incomes", "households", name: "incomes_household_id_fkey", on_delete: :cascade
  add_foreign_key "ocr_entries", "documents", name: "ocr_entries_document_id_fkey", on_delete: :cascade
end
