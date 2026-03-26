# main.tf
provider "google" {
  project = var.project_id
  region  = var.region
}

# Service Account for the ADK Agent
resource "google_service_account" "adk_agent_sa" {
  account_id   = "adk-agent-evaluator"
  display_name = "ADK Agent Evaluator Service Account"
}

# Bind Vertex AI role to SA
resource "google_project_iam_member" "adk_agent_vertex_user" {
  project = var.project_id
  role    = "roles/aiplatform.user"
  member  = "serviceAccount:${google_service_account.adk_agent_sa.email}"
}
