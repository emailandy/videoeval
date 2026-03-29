class MockBlob:
    def download_as_string(self, client=None):
        print(f"[Mock] Downloading content from MockBlob")
        return b"Mock video content"

class GCSApiService:
    def get_reduced_uri(self, config, video_uri):
        print(f"[Mock] Getting reduced URI for {video_uri}")
        return f"{video_uri}_reduced"
    
    def get_blob(self, uri):
        print(f"[Mock] Getting blob for {uri}")
        if "_reduced" in uri:
            # For reduced URI, return None to simulate that it doesn't exist yet and needs shortening.
            return None
        # For original URI, return MockBlob to simulate that it exists and can be downloaded.
        return MockBlob()
    
    def upload_blob(self, uri, file_path):
        print(f"[Mock] Uploading blob {file_path} to {uri}")
        pass

gcs_api_service = GCSApiService()
