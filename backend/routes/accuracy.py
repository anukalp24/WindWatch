from fastapi import APIRouter
accuracyRouter = APIRouter()
from controller.accuracy import accuracy


accuracyRouter.add_api_route("/accuracy" , accuracy , methods=["GET"])