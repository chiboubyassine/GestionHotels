// server.js - Version complète et optimisée
const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");
const dotenv = require("dotenv");
dotenv.config();

const app = express();

// ============ CONFIGURATION CORS AMÉLIORÉE ============
app.use(cors({
    origin: 'http://localhost:3000', // Frontend React
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

// ============ MIDDLEWARES ============
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============ CONNEXION À LA BASE DE DONNÉES ============
const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "root",
    database: "gestion_hotels",
    port: 3306,
    multipleStatements: true
});

db.connect((err) => {
    if (err) {
        console.log("❌ Erreur MySQL :", err);
        console.log("💡 Vérifiez que MySQL est démarré (XAMPP/WAMP/MAMP)");
        process.exit(1);
    } else {
        console.log("✅ MySQL connecté avec succès");
        console.log("📊 Base de données: gestion_hotels");
    }
});

// ============ ROUTE DE TEST ============
app.get("/", (req, res) => {
    res.json({
        message: "API HOTELS FONCTIONNE BIEN",
        status: "online",
        endpoints: {
            test: "/api/test-db",
            users: "/api/test-users",
            login: "/api/login",
            dashboard: "/api/dashboard/stats"
        }
    });
});

// ============ ENDPOINT LOGIN ============
app.post("/api/login", (req, res) => {
    const { email, password } = req.body;
    
    // Validation des champs
    if (!email || !password) {
        return res.status(400).json({
            success: false,
            message: "Email et mot de passe requis"
        });
    }

    console.log(`🔐 Tentative de connexion: ${email}`);

    const sql = "SELECT * FROM utilisateur WHERE email = ? AND mot_de_passe = ?";
    db.query(sql, [email, password], (err, results) => {
        if (err) {
            console.error("❌ Erreur login:", err);
            return res.status(500).json({
                success: false,
                message: "Erreur serveur lors de la connexion"
            });
        }

        if (results.length > 0) {
            const user = results[0];
            console.log(`✅ Connexion réussie: ${user.nom} (${user.role})`);
            
            // Pour les clients, retrouver leur fiche dans la table clients (liée par email)
            if (user.role === "client") {
                return db.query("SELECT id FROM clients WHERE email = ?", [user.email], (err2, clientRows) => {
                    if (err2) {
                        console.error("❌ Erreur recherche client lors du login:", err2.message);
                    }
                    const client_id = clientRows?.[0]?.id || null;
                    return res.json({
                        success: true,
                        role: user.role || "user",
                        client_id: client_id,
                        user: {
                            id: user.id,
                            nom: user.nom,
                            prenom: clientRows?.[0]?.id ? (user.nom || "") : "",
                            email: user.email,
                            role: user.role,
                            client_id: client_id
                        }
                    });
                });
            }

            return res.json({
                success: true,
                role: user.role || "user",
                user: {
                    id: user.id,
                    nom: user.nom,
                    email: user.email,
                    role: user.role
                }
            });
        } else {
            console.log(`❌ Échec de connexion: ${email}`);
            return res.status(401).json({
                success: false,
                message: "Email ou mot de passe incorrect"
            });
        }
    });
});

// ============ ENDPOINT INSCRIPTION CLIENT ============
app.post("/api/register", (req, res) => {
    const { nom, prenom, email, telephone, adresse, mot_de_passe } = req.body;

    if (!nom || !prenom || !email || !mot_de_passe) {
        return res.status(400).json({
            success: false,
            message: "Nom, prénom, email et mot de passe sont requis"
        });
    }

    if (mot_de_passe.length < 6) {
        return res.status(400).json({
            success: false,
            message: "Le mot de passe doit contenir au moins 6 caractères"
        });
    }

    console.log(`📝 Inscription client: ${email}`);

    // Vérifier que l'email n'est pas déjà utilisé pour un compte
    db.query("SELECT id FROM utilisateur WHERE email = ?", [email], (err, userRows) => {
        if (err) {
            console.error("❌ Erreur vérification email:", err);
            return res.status(500).json({ success: false, message: "Erreur serveur lors de l'inscription" });
        }
        if (userRows.length > 0) {
            return res.status(409).json({ success: false, message: "Cet email est déjà utilisé" });
        }

        // Vérifier si une fiche client existe déjà pour cet email
        db.query("SELECT id FROM clients WHERE email = ?", [email], (err4, existingClient) => {
            if (err4) {
                console.error("❌ Erreur vérification client:", err4.message);
                return res.status(500).json({ success: false, message: "Erreur serveur lors de l'inscription" });
            }

            const createClient = (callback) => {
                if (existingClient.length > 0) {
                    // Fiche client existante : on la réutilise
                    return callback(existingClient[0].id);
                }
                // 1) Créer la fiche client
                const sqlClient = "INSERT INTO clients (nom, prenom, email, telephone, adresse) VALUES (?, ?, ?, ?, ?)";
                db.query(sqlClient, [nom, prenom, email, telephone || null, adresse || null], (err2, clientResult) => {
                    if (err2) {
                        console.error("❌ Erreur création fiche client:", err2.message);
                        return res.status(500).json({ success: false, message: "Erreur lors de la création du client" });
                    }
                    callback(clientResult.insertId);
                });
            };

            createClient((client_id) => {
                // 2) Créer le compte utilisateur (rôle client)
                const sqlUser = "INSERT INTO utilisateur (nom, email, mot_de_passe, role) VALUES (?, ?, ?, 'client')";
                db.query(sqlUser, [nom, email, mot_de_passe], (err3, userResult) => {
                    if (err3) {
                        console.error("❌ Erreur création compte:", err3.message);
                        return res.status(500).json({ success: false, message: "Erreur lors de la création du compte" });
                    }

                    console.log(`✅ Client inscrit: ${email} (client_id=${client_id})`);
                    return res.status(201).json({
                        success: true,
                        message: "Compte créé avec succès",
                        client_id: client_id,
                        user: {
                            id: userResult.insertId,
                            nom: nom,
                            email: email,
                            role: "client"
                        }
                    });
                });
            });
        });
    });
});

// ============ ENDPOINTS DE TEST ============
app.get("/api/test-db", (req, res) => {
    db.query("SELECT 1 as test", (err, results) => {
        if (err) {
            return res.status(500).json({
                error: "Erreur de connexion à la base de données",
                details: err.message
            });
        }
        res.json({
            message: "✅ Connexion à la base de données OK",
            result: results
        });
    });
});

app.get("/api/test-users", (req, res) => {
    db.query("SELECT id, nom, email, role FROM utilisateur", (err, results) => {
        if (err) {
            return res.status(500).json({
                error: "Erreur sur la table utilisateur",
                details: err.message
            });
        }
        res.json({
            users: results,
            count: results.length
        });
    });
});

// ============ ENDPOINTS CRUD CHAMBRES ============
app.get("/api/chambres", (req, res) => {
    db.query("SELECT * FROM chambres ORDER BY numero", (err, results) => {
        if (err) {
            console.error("❌ Erreur chambres:", err);
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});

app.get("/api/chambres/:id", (req, res) => {
    const { id } = req.params;
    db.query("SELECT * FROM chambres WHERE id = ?", [id], (err, results) => {
        if (err) {
            console.error("❌ Erreur chambre:", err);
            return res.status(500).json({ error: err.message });
        }
        if (results.length === 0) {
            return res.status(404).json({ message: "Chambre non trouvée" });
        }
        res.json(results[0]);
    });
});

app.post("/api/chambres", (req, res) => {
    const { numero, type, prix, statut, description } = req.body;
    const sql = "INSERT INTO chambres (numero, type, prix, statut, description) VALUES (?, ?, ?, ?, ?)";
    db.query(sql, [numero, type, prix, statut || 'disponible', description], (err, result) => {
        if (err) {
            console.error("❌ Erreur création chambre:", err);
            return res.status(500).json({ error: err.message });
        }
        res.status(201).json({
            message: "Chambre créée avec succès",
            id: result.insertId
        });
    });
});

app.put("/api/chambres/:id", (req, res) => {
    const { id } = req.params;
    const { numero, type, prix, statut, description } = req.body;
    const sql = "UPDATE chambres SET numero = ?, type = ?, prix = ?, statut = ?, description = ? WHERE id = ?";
    db.query(sql, [numero, type, prix, statut, description, id], (err, result) => {
        if (err) {
            console.error("❌ Erreur mise à jour chambre:", err);
            return res.status(500).json({ error: err.message });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Chambre non trouvée" });
        }
        res.json({ message: "Chambre mise à jour avec succès" });
    });
});

app.delete("/api/chambres/:id", (req, res) => {
    const { id } = req.params;
    db.query("DELETE FROM chambres WHERE id = ?", [id], (err, result) => {
        if (err) {
            console.error("❌ Erreur suppression chambre:", err);
            return res.status(500).json({ error: err.message });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Chambre non trouvée" });
        }
        res.json({ message: "Chambre supprimée avec succès" });
    });
});

// ============ ENDPOINTS CRUD CLIENTS ============
app.get("/api/clients", (req, res) => {
    db.query("SELECT * FROM clients ORDER BY nom", (err, results) => {
        if (err) {
            console.error("❌ Erreur clients:", err);
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});

app.get("/api/clients/:id", (req, res) => {
    const { id } = req.params;
    db.query("SELECT * FROM clients WHERE id = ?", [id], (err, results) => {
        if (err) {
            console.error("❌ Erreur client:", err);
            return res.status(500).json({ error: err.message });
        }
        if (results.length === 0) {
            return res.status(404).json({ message: "Client non trouvé" });
        }
        res.json(results[0]);
    });
});

app.post("/api/clients", (req, res) => {
    const { nom, prenom, email, telephone, adresse } = req.body;
    const sql = "INSERT INTO clients (nom, prenom, email, telephone, adresse) VALUES (?, ?, ?, ?, ?)";
    db.query(sql, [nom, prenom, email, telephone, adresse], (err, result) => {
        if (err) {
            console.error("❌ Erreur création client:", err);
            return res.status(500).json({ error: err.message });
        }
        res.status(201).json({
            message: "Client créé avec succès",
            id: result.insertId
        });
    });
});

app.put("/api/clients/:id", (req, res) => {
    const { id } = req.params;
    const { nom, prenom, email, telephone, adresse } = req.body;
    const sql = "UPDATE clients SET nom = ?, prenom = ?, email = ?, telephone = ?, adresse = ? WHERE id = ?";
    db.query(sql, [nom, prenom, email, telephone, adresse, id], (err, result) => {
        if (err) {
            console.error("❌ Erreur mise à jour client:", err);
            return res.status(500).json({ error: err.message });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Client non trouvé" });
        }
        res.json({ message: "Client mis à jour avec succès" });
    });
});

app.delete("/api/clients/:id", (req, res) => {
    const { id } = req.params;
    db.query("DELETE FROM clients WHERE id = ?", [id], (err, result) => {
        if (err) {
            console.error("❌ Erreur suppression client:", err);
            return res.status(500).json({ error: err.message });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Client non trouvé" });
        }
        res.json({ message: "Client supprimé avec succès" });
    });
});

// ============ ENDPOINTS CRUD RÉSERVATIONS ============
app.get("/api/reservations", (req, res) => {
    const { client_id } = req.query;
    let sql = `
        SELECT 
            r.*,
            c.nom AS client_nom,
            c.prenom AS client_prenom,
            c.email AS client_email,
            ch.numero AS chambre_numero,
            ch.type AS chambre_type
        FROM reservations r
        JOIN clients c ON r.client_id = c.id
        JOIN chambres ch ON r.chambre_id = ch.id
    `;
    const params = [];
    if (client_id) {
        sql += " WHERE r.client_id = ?";
        params.push(client_id);
    }
    sql += " ORDER BY r.date_reservation DESC";
    db.query(sql, params, (err, results) => {
        if (err) {
            console.error("❌ Erreur reservations:", err);
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});

app.get("/api/reservations/:id", (req, res) => {
    const { id } = req.params;
    const sql = `
        SELECT 
            r.*,
            c.nom AS client_nom,
            c.prenom AS client_prenom,
            c.email AS client_email,
            ch.numero AS chambre_numero,
            ch.type AS chambre_type
        FROM reservations r
        JOIN clients c ON r.client_id = c.id
        JOIN chambres ch ON r.chambre_id = ch.id
        WHERE r.id = ?
    `;
    db.query(sql, [id], (err, results) => {
        if (err) {
            console.error("❌ Erreur reservation:", err);
            return res.status(500).json({ error: err.message });
        }
        if (results.length === 0) {
            return res.status(404).json({ message: "Réservation non trouvée" });
        }
        res.json(results[0]);
    });
});

app.post("/api/reservations", (req, res) => {
    const { client_id, chambre_id, date_debut, date_fin, montant_total, statut, nombre_personnes } = req.body;
    const sql = `
        INSERT INTO reservations 
        (client_id, chambre_id, date_debut, date_fin, montant_total, statut, nombre_personnes, date_reservation) 
        VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
    `;
    db.query(sql, [client_id, chambre_id, date_debut, date_fin, montant_total, statut || 'en_attente', nombre_personnes || 1], (err, result) => {
        if (err) {
            console.error("❌ Erreur création reservation:", err);
            return res.status(500).json({ error: err.message });
        }
        res.status(201).json({
            message: "Réservation créée avec succès",
            id: result.insertId
        });
    });
});

app.put("/api/reservations/:id", (req, res) => {
    const { id } = req.params;
    const { client_id, chambre_id, date_debut, date_fin, montant_total, statut } = req.body;
    const sql = `
        UPDATE reservations 
        SET client_id = ?, chambre_id = ?, date_debut = ?, date_fin = ?, montant_total = ?, statut = ?
        WHERE id = ?
    `;
    db.query(sql, [client_id, chambre_id, date_debut, date_fin, montant_total, statut, id], (err, result) => {
        if (err) {
            console.error("❌ Erreur mise à jour reservation:", err);
            return res.status(500).json({ error: err.message });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Réservation non trouvée" });
        }
        res.json({ message: "Réservation mise à jour avec succès" });
    });
});

app.delete("/api/reservations/:id", (req, res) => {
    const { id } = req.params;
    db.query("DELETE FROM reservations WHERE id = ?", [id], (err, result) => {
        if (err) {
            console.error("❌ Erreur suppression reservation:", err);
            return res.status(500).json({ error: err.message });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Réservation non trouvée" });
        }
        res.json({ message: "Réservation supprimée avec succès" });
    });
});

// ============ STATISTIQUES DU DASHBOARD ============
app.get("/api/dashboard/stats", (req, res) => {
    const stats = {};
    
    // Total des chambres
    db.query("SELECT COUNT(*) AS total FROM chambres", (err, chambres) => {
        if (err) {
            console.error("❌ Erreur stats chambres:", err);
            return res.status(500).json({ error: err.message });
        }
        stats.chambres = chambres?.[0]?.total || 0;
        
        // Total des clients
        db.query("SELECT COUNT(*) AS total FROM clients", (err, clients) => {
            if (err) {
                console.error("❌ Erreur stats clients:", err);
                return res.status(500).json({ error: err.message });
            }
            stats.clients = clients?.[0]?.total || 0;
            
            // Total des réservations
            db.query("SELECT COUNT(*) AS total FROM reservations", (err, reservations) => {
                if (err) {
                    console.error("❌ Erreur stats reservations:", err);
                    return res.status(500).json({ error: err.message });
                }
                stats.reservations = reservations?.[0]?.total || 0;
                
                // Revenu total
                db.query(
                    "SELECT SUM(montant_total) AS revenu FROM reservations WHERE statut = 'confirmee'",
                    (err, revenu) => {
                        if (err) {
                            console.error("❌ Erreur stats revenu:", err);
                            return res.status(500).json({ error: err.message });
                        }
                        stats.revenu = revenu?.[0]?.revenu || 0;
                        res.json(stats);
                    }
                );
            });
        });
    });
});

// ============ STATISTIQUES DÉTAILLÉES ============
app.get("/api/dashboard/stats-detailed", (req, res) => {
    const stats = {};
    
    // Réservations par statut
    db.query(
        "SELECT statut, COUNT(*) AS total FROM reservations GROUP BY statut",
        (err, statuts) => {
            if (err) {
                console.error("❌ Erreur stats statuts:", err);
                return res.status(500).json({ error: err.message });
            }
            stats.reservationsParStatut = statuts || [];
            
            // Réservations d'aujourd'hui
            db.query(
                "SELECT COUNT(*) AS aujourdhui FROM reservations WHERE DATE(date_reservation) = CURDATE()",
                (err, aujourdhui) => {
                    if (err) {
                        console.error("❌ Erreur stats aujourd'hui:", err);
                        return res.status(500).json({ error: err.message });
                    }
                    stats.reservationsAujourdhui = aujourdhui?.[0]?.aujourdhui || 0;
                    
                    // Taux d'occupation
                    db.query(
                        `SELECT 
                            COUNT(*) AS occupees,
                            (SELECT COUNT(*) FROM chambres) AS total
                        FROM reservations 
                        WHERE statut = 'confirmee' 
                        AND DATE(date_debut) <= CURDATE() 
                        AND DATE(date_fin) >= CURDATE()`,
                        (err, occupation) => {
                            if (err) {
                                console.error("❌ Erreur stats occupation:", err);
                                return res.status(500).json({ error: err.message });
                            }
                            stats.tauxOccupation = occupation?.[0] ? 
                                Math.round((occupation[0].occupees / occupation[0].total) * 100) : 0;
                            
                            // Dernières réservations
                            db.query(
                                `SELECT 
                                    r.*, 
                                    c.nom AS client_nom,
                                    c.prenom AS client_prenom,
                                    c.email AS client_email,
                                    ch.numero AS chambre_numero,
                                    ch.type AS chambre_type
                                FROM reservations r
                                JOIN clients c ON r.client_id = c.id
                                JOIN chambres ch ON r.chambre_id = ch.id
                                ORDER BY r.date_reservation DESC
                                LIMIT 5`,
                                (err, dernieres) => {
                                    if (err) {
                                        console.error("❌ Erreur stats dernieres:", err);
                                        return res.status(500).json({ error: err.message });
                                    }
                                    stats.dernieresReservations = dernieres || [];
                                    res.json({ success: true, data: stats });
                                }
                            );
                        }
                    );
                }
            );
        }
    );
});

// ============ GRAPHIQUES ============
app.get("/api/dashboard/reservations-chart", (req, res) => {
    const sql = `
        SELECT
            MONTH(date_reservation) AS mois,
            COUNT(*) AS total
        FROM reservations
        GROUP BY MONTH(date_reservation)
        ORDER BY mois
    `;
    db.query(sql, (err, results) => {
        if (err) {
            console.error("❌ Erreur reservations chart:", err);
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});

app.get("/api/dashboard/income-chart", (req, res) => {
    const sql = `
        SELECT
            MONTH(date_reservation) AS mois,
            SUM(montant_total) AS revenu
        FROM reservations
        WHERE statut IN ('confirmee', 'terminee')
        GROUP BY MONTH(date_reservation)
        ORDER BY mois
    `;
    db.query(sql, (err, results) => {
        if (err) {
            console.error("❌ Erreur income chart:", err);
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});

app.get("/api/dashboard/reservations-by-room", (req, res) => {
    const sql = `
        SELECT 
            ch.type,
            COUNT(*) AS total
        FROM reservations r
        JOIN chambres ch ON r.chambre_id = ch.id
        WHERE r.statut IN ('confirmee', 'en_attente')
        GROUP BY ch.type
    `;
    db.query(sql, (err, results) => {
        if (err) {
            console.error("❌ Erreur reservations by room:", err);
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});

app.get("/api/dashboard/monthly-income", (req, res) => {
    const sql = `
        SELECT 
            MONTH(date_reservation) AS mois,
            SUM(montant_total) AS revenu
        FROM reservations
        WHERE statut IN ('confirmee', 'terminee')
        AND YEAR(date_reservation) = YEAR(CURDATE())
        GROUP BY MONTH(date_reservation)
        ORDER BY MONTH(date_reservation)
    `;
    db.query(sql, (err, results) => {
        if (err) {
            console.error("❌ Erreur monthly income:", err);
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});

// ============ GESTION DES ERREURS 404 ============
app.use((req, res) => {
    res.status(404).json({
        error: "Route non trouvée",
        message: `La route ${req.method} ${req.url} n'existe pas`
    });
});

// ============ GESTION DES ERREURS GÉNÉRALES ============
app.use((err, req, res, next) => {
    console.error("❌ Erreur serveur:", err);
    res.status(500).json({
        error: "Erreur interne du serveur",
        message: err.message
    });
});

// ============ DÉMARRAGE DU SERVEUR ============
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log("=".repeat(50));
    console.log("🚀 SERVEUR DÉMARRÉ AVEC SUCCÈS");
    console.log("=".repeat(50));
    console.log(`📡 Adresse: http://localhost:${PORT}`);
    console.log(`🔑 API Login: http://localhost:${PORT}/api/login`);
    console.log(`📊 Dashboard: http://localhost:${PORT}/api/dashboard/stats`);
    console.log(`🧪 Test DB: http://localhost:${PORT}/api/test-db`);
    console.log("=".repeat(50));
    console.log("✅ En attente des connexions...");
    console.log("=".repeat(50));
});

// ============ GESTION DE L'ARRÊT DU SERVEUR ============
process.on('SIGINT', () => {
    console.log("\n🛑 Arrêt du serveur...");
    db.end((err) => {
        if (err) {
            console.error("❌ Erreur lors de la fermeture de MySQL:", err);
        } else {
            console.log("✅ Connexion MySQL fermée");
        }
        process.exit(0);
    });
});