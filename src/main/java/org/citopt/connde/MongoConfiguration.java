package org.citopt.connde;

import java.util.ArrayList;
import java.util.List;

import javax.annotation.PostConstruct;

import org.bson.Document;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.mongodb.config.AbstractMongoClientConfiguration;
import org.springframework.data.mongodb.repository.config.EnableMongoRepositories;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import com.mongodb.client.MongoDatabase;

@Configuration
@EnableMongoRepositories
public class MongoConfiguration extends AbstractMongoClientConfiguration {
	
	public static final String DB_NAME = "connde";
	
	@Autowired
	private PasswordEncoder passwordEncoder;

	@Override
	@Bean
	public MongoClient mongoClient() {
		MongoClient mc = MongoClients.create("mongodb://localhost:27017");
		return mc;
	}
	
	@Override
	protected String getDatabaseName() {
		return DB_NAME;
	}

	@Override
	protected String getMappingBasePackage() {
		return "org.citopt.connde.repository";
	}

	@PostConstruct
	private void addValuesInDatabase() {
		MongoDatabase database = mongoClient().getDatabase(getDatabaseName());

		if (!collectionExists(database, "user")) {
			database.createCollection("user");
			List<Document> documents = new ArrayList<>();

			// An administration user
			Document adminUser = new Document();
			adminUser.put("_class", "org.citopt.connde.domain.user.User");
			adminUser.put("first_name", "Admin");
			adminUser.put("last_name", "Admin");
			adminUser.put("username", "admin");
			adminUser.put("isAdmin", true);
			adminUser.put("password", passwordEncoder.encode("admin"));

			documents.add(adminUser);

			// A user for the MBP platform to authenticate itself over http to retrieve an
			// OAuth token
			Document mbpUser = new Document();
			mbpUser.put("_class", "org.citopt.connde.domain.user.User");
			mbpUser.put("first_name", "MBP");
			mbpUser.put("last_name", "Platform");
			mbpUser.put("username", "mbp");
			mbpUser.put("isAdmin", false);
			mbpUser.put("password", passwordEncoder.encode("mbp-platform"));

			documents.add(mbpUser);

			// A user which is used by IoT devices for http authentication
			Document deviceUser = new Document();
			deviceUser.put("_class", "org.citopt.connde.domain.user.User");
			deviceUser.put("first_name", "Device");
			deviceUser.put("last_name", "Client");
			deviceUser.put("username", "device-client");
			deviceUser.put("isAdmin", false);
			deviceUser.put("password", passwordEncoder.encode("device"));

			documents.add(deviceUser);
			database.getCollection("user").insertMany(documents);
		}
	}

	private boolean collectionExists(MongoDatabase database, String collectionName) {
		for (final String name : database.listCollectionNames()) {
			if (name.equalsIgnoreCase(collectionName)) {
				return true;
			}
		}
		return false;
	}

}
