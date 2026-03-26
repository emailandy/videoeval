# backend.tf
terraform {
  backend "gcs" {
    bucket = "rev-reco-tfstate-adk"
    prefix = "terraform/state"
  }
}
