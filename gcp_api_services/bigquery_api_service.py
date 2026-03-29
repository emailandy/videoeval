class BigQueryAPIService:
    def __init__(self, project_id):
        self.project_id = project_id
        print(f"[Mock] Initialized BigQueryAPIService with project_id: {project_id}")

    def create_dataset(self, dataset_name, zone):
        print(f"[Mock] Creating dataset {dataset_name} in {zone}")
        pass

    def create_table(self, dataset_name, table_name, schema):
        print(f"[Mock] Creating table {dataset_name}.{table_name}")
        return True

    def load_table_from_dataframe(self, dataset_name, table_name, dataframe, schema, write_mode):
        print(f"[Mock] Loading data into {dataset_name}.{table_name}")
        pass
