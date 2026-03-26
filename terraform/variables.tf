# variables.tf
variable "project_id" {
  description = "The GCP Project ID"
  type        = string
  default     = "rev-reco"
}

variable "region" {
  description = "The GCP Region"
  type        = string
  default     = "us-central1"
}
