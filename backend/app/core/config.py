from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    app_name: str = "Cargo Ops Backend"
    airport_api_key: str = ""
    airport_api_base_url: str = ""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
