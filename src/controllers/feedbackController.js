import { RatingAndFeedback } from '../models/feedback.model.js';
import mongoose from 'mongoose';
import { Retailer } from '../models/retailer.model.js';
import { User } from '../models/user.model.js';

// export const createRatingAndFeedback = async (req, res) => {
//     try {
//         const data = req.body;

//         // console.log('data', data);
//         if (!data.user || !data.retailer || !data.rating || !data.feedback) {
//             return res.status(400).json({ message: 'All fields are required' });
//         }
//         const createdRating = await RatingAndFeedback.create({
//             user: data.user,
//             retailer: data.retailer,
//             rating: data.rating,
//             feedback: data.feedback
//         });

//         const updateRetailer = await Retailer.findByIdAndUpdate({ _id: data.retailer }, { $inc: { totalRating: data.rating, totalReview: 1 } });

//         if (createdRating) {
//             return res.status(201).json(createdRating);
//         }
//         else {
//             return res.status(404).json({ message: 'Rating not created' });
//         }
//     } catch (error) {
//         throw new Error(error.message);
//     }
// }


export const createRatingAndFeedback = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { user, sender, rating, feedback, senderName, chatId } = req.body;

        if (!user || !sender || !rating || !senderName) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        const createdRating = await RatingAndFeedback.create([{
            user,
            sender,
            senderName,
            rating,
            feedback,
        }], { session });

        if (!createdRating) {
            await session.abortTransaction();
            session.endSession();
            return res.status(500).json({ message: 'Rating not created' });
        }

        if (user.type === 'Retailer') {
            const updateRetailer = await Retailer.findByIdAndUpdate(
                user.refId,
                { $inc: { totalRating: rating, totalReview: 1 } },
                { new: true, session }
            );
            if (!updateRetailer) {
                await session.abortTransaction();
                session.endSession();
                return res.status(404).json({ message: 'Retailer not found' });
            }

        }
        else {
            const updateUser = await User.findByIdAndUpdate(
                user.refId,
                { $inc: { totalRating: rating, totalReview: 1 } },
                { new: true, session }
            );

            if (!updateUser) {
                await session.abortTransaction();
                session.endSession();
                return res.status(404).json({ message: 'User not found' });
            }

            const updatedChat = await Chat.findByIdAndUpdate(
                chatId,
                { rated: true },
                { new: true, session }
            );
            if (!updatedChat) {
                await session.abortTransaction();
                session.endSession();
                return res.status(404).json({ message: 'Chat not found' });
            }
        }





        await session.commitTransaction();
        session.endSession();

        return res.status(201).json(createdRating);

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        return res.status(500).json({ message: error.message });
    }
}

export const getRetailerFeedbacks = async (req, res) => {
    try {
        const { id } = req.query;
        if (!id) {
            return res.status(400).json({ message: 'Invalid request' });
        }
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid ID format' });
        }

        const feedbacks = await RatingAndFeedback.find({
            $and: [
                { "user.type": "Retailer", "user.refId": id },
                { feedback: { $ne: '' } }
            ]
        });
        return res.status(200).json(feedbacks);

    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
}

