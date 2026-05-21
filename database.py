import mysql.connector
import os

def conectar():
    conexion = mysql.connector.connect(
        host=os.environ.get("MYSQLHOST", "localhost"),
        user=os.environ.get("MYSQLUSER", "root"),
        password=os.environ.get("MYSQLPASSWORD", "root"),
        database=os.environ.get("MYSQLDATABASE", "farmavida"),
        port=int(os.environ.get("MYSQLPORT", 3306)),
        time_zone='-05:00'
    )
    return conexion