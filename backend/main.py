from fastapi import FastAPI
app = FastAPI(title="DOHWA API")

@app.get("/")
def home():
    return {"message": "DOHWA Backend 실행 성공!"}