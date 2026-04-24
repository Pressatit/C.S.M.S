from dotenv import load_dotenv
load_dotenv()

import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from sqlalchemy.ext.declarative import declarative_base
if os.getenv("DATABASE_URL"):
   DATABASE_URL=os.getenv("DATABASE_URL",)
else:
   print("Well...cant find the db at .env")

engine=create_engine(DATABASE_URL)

SessionLocal=sessionmaker(autocommit=False,bind=engine,autoflush=False)

Base=declarative_base()

def get_db():
   db=SessionLocal()
   try:
      yield db
   finally:
      db.close()



      

