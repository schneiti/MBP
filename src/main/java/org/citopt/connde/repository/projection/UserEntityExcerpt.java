package org.citopt.connde.repository.projection;

import java.util.List;

import org.citopt.connde.domain.access_control.IACRequestedEntity;
import org.springframework.beans.factory.annotation.Value;

/**
 * Basic list projection for user entities. To be extended by more concrete
 * projections for the individual user entity types.
 */
public interface UserEntityExcerpt extends IACRequestedEntity {

	@Value("#{target.wasModelled()}")
	boolean getWasModelled();

	@Value("#{target.getOwnerName()}")
	String getOwnerName();

	@Override
	@Value("#{target.getAccessControlPolicyIds()}")
	List<String> getAccessControlPolicyIds();
	
}
