package org.citopt.connde.error;

/**
 * @author Jakob Benz
 */
public abstract class EntityException extends Exception {
	
	private static final long serialVersionUID = 5611832137699036754L;
	
	private String entityType;
	private String entityId;
	
	// - - -
	
	public EntityException(String entityType) {
		super();
		this.entityType = entityType;
	}
	
	public EntityException(String entityType, String entityId) {
		super();
		this.entityType = entityType;
		this.entityId = entityId;
	}
	

	// - - -

	public String getEntityType() {
		return entityType;
	}
	
	public String getEntityId() {
		return entityId;
	}
	
	// - - -
	
	public String getEntityDescription() {
		StringBuilder sb = new StringBuilder();
		sb.append(entityType);
		if (entityId != null) {
			sb.append(" with id '").append(entityId).append("'");
		}
		return sb.toString();
	}
	
}
