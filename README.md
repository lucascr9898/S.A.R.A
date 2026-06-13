S.A.R.A
Sistema Automático de Reconhecimento de Autenticidade. Permite registrar produtos com QR Codes únicos e verificar a autenticidade deles via API.

Stack
Frontend: HTML, CSS puro
Backend: Node.js + Express
Banco: MySQL
Estrutura
sara/
├── frontend/       # site estático
├── src/
│   ├── controllers/
│   ├── middlewares/
│   ├── routes/
│   └── config/
├── .env.example
└── package.json
Como rodar
1. Banco de dados

CREATE DATABASE sara_db;
CREATE USER 'sara_user'@'localhost' IDENTIFIED BY 'sara_senha_segura';
GRANT ALL ON sara_db.* TO 'sara_user'@'localhost';
2. Backend

cp .env.example .env
npm install
npm run migrate
npm run seed
npm start
A API sobe em http://localhost:3000.

3. Frontend

Abra frontend/index.html no navegador.

Credenciais de teste
email: admin@sara.com
senha: admin123
Endpoints
Método	Rota	Auth
GET	/health	—
POST	/api/auth/login	—
GET	/api/verificar/:codigo	—
GET	/api/produtos	✓
POST	/api/produtos/registrar	✓
POST	/api/venda/registrar	✓
GET	/api/venda/historico	✓
QR Codes de exemplo
Código	Resultado
SARA-2026-00142-OK	✅ Original
SARA-2026-00089-OK	✅ Original
SARA-2026-00031-FRAUD	⚠️ Fraude
SARA-2026-00077-FRAUD	⚠️ Fraude
