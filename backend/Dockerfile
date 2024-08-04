FROM mcr.microsoft.com/devcontainers/python:1-3.12-bullseye
WORKDIR /workspaces
COPY backend .
EXPOSE 9527
RUN pip3 install -r requirements.txt
CMD ["python3", "app.py"]