from fastapi import APIRouter
Forecastrouter = APIRouter()
from controller.forecast import forecast


Forecastrouter.add_api_route("/forecast" , forecast , methods=["GET"])